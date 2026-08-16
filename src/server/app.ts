import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { loadAppliedJobs, updateStatus, recordApplication } from "../jobs/tracker.js";
import { getDueFollowUps } from "../jobs/tracker.js";
import { fetchJobs } from "../jobs/search.js";
import { scrapeJobUrl } from "../jobs/scraper.js";
import { scoreJobs } from "../jobs/scorer.js";
import { tailorCV } from "../cv/tailor.js";
import { generateCoverLetter } from "../cv/coverLetter.js";
import { loadProfile, saveProfile, profileToText } from "../profile/profile.js";
import { parseProfileFromText } from "../profile/parser.js";
import { parseCompaniesFromExcel, addCompaniesToProfile, getPreferredCompanies } from "../jobs/excelParser.js";
import { rankCompanies } from "../jobs/companyRanker.js";
import { chat } from "./chat.js";
import type { ChatMessage } from "./chat.js";
import type { AppliedJob, Profile } from "../profile/types.js";
import type { ScoredJob } from "../jobs/types.js";

const app = express();
app.use(cors());
app.use(express.json());

// Raw binary body parser used only for the Excel upload route
const rawBody = express.raw({ type: "application/octet-stream", limit: "10mb" });

// ─── Applications ─────────────────────────────────────────────────────────────

app.get("/api/applications", (_req: Request, res: Response) => {
  res.json(loadAppliedJobs());
});

app.patch("/api/applications/:id", (req: Request, res: Response) => {
  const id = req.params["id"] as string;
  const { status, notes } = req.body as { status: AppliedJob["status"]; notes?: string };
  const valid: AppliedJob["status"][] = [
    "applied", "screening", "interview", "offer", "rejected", "ghosted",
  ];
  if (!valid.includes(status)) {
    res.status(400).json({ error: `Invalid status. Choose from: ${valid.join(", ")}` });
    return;
  }
  try {
    updateStatus(id, status, notes);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

// ─── Reminders ────────────────────────────────────────────────────────────────

app.get("/api/reminders", (_req: Request, res: Response) => {
  res.json(getDueFollowUps());
});

// ─── Job search ───────────────────────────────────────────────────────────────

let searchInProgress = false;

app.post("/api/run", async (_req: Request, res: Response) => {
  if (searchInProgress) {
    res.status(409).json({ error: "A job search is already in progress" });
    return;
  }
  searchInProgress = true;
  try {
    const profile = loadProfile();
    const jobs = await fetchJobs(profile);
    res.json({ ok: true, jobs });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  } finally {
    searchInProgress = false;
  }
});

app.get("/api/run/status", (_req: Request, res: Response) => {
  res.json({ running: searchInProgress });
});

// ─── Profile ──────────────────────────────────────────────────────────────────

app.get("/api/profile", (_req: Request, res: Response) => {
  try {
    res.json(loadProfile());
  } catch {
    // Profile doesn't exist yet — return null so the UI knows to prompt setup
    res.json(null);
  }
});

app.put("/api/profile", (req: Request, res: Response) => {
  const profile = req.body as Profile;
  if (!profile?.name) {
    res.status(400).json({ error: "Profile must include at least a name." });
    return;
  }
  saveProfile(profile);
  res.json({ ok: true });
});

app.post("/api/profile/parse", async (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };
  if (!text || text.trim().length < 50) {
    res.status(400).json({ error: "CV text is too short to parse." });
    return;
  }

  try {
    // Preserve existing job-tracking data across re-parses
    let existing: Parameters<typeof parseProfileFromText>[1] = {};
    try {
      const current = loadProfile();
      existing = {
        appliedJobIds: current.appliedJobIds,
        preferredCompanies: current.preferredCompanies,
        targetRoles: current.targetRoles,
        targetLocations: current.targetLocations,
        salaryMin: current.salaryMin,
      };
    } catch { /* no profile yet — fine */ }

    const profile = await parseProfileFromText(text, existing);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Apply from URL ───────────────────────────────────────────────────────────

export interface ApplyUrlResult {
  job: ScoredJob;
  tailoredCV: import("../cv/tailor.js").TailoredCV;
  coverLetter: string;
}

app.post("/api/apply-url", async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };
  if (!url || !url.startsWith("http")) {
    res.status(400).json({ error: "A valid URL is required." });
    return;
  }

  try {
    const profile = loadProfile();

    // 1. Scrape
    const rawJob = await scrapeJobUrl(url);

    // 2. Score (reuse batch scorer with a single job)
    const [scored] = await scoreJobs([rawJob], profile);

    // 3. Tailor CV + cover letter
    const [tailored, coverLetter] = await Promise.all([
      tailorCV(profile, scored),
      generateCoverLetter(profile, scored),
    ]);

    // 4. Track application
    const today = new Date().toISOString().slice(0, 10);
    const followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    recordApplication({
      id: scored.id,
      title: scored.title,
      company: scored.company,
      url: scored.url,
      appliedDate: today,
      status: "applied",
      followUpDate,
    });

    if (!profile.appliedJobIds.includes(scored.id)) {
      profile.appliedJobIds.push(scored.id);
      saveProfile(profile);
    }

    res.json({ job: scored, tailoredCV: tailored, coverLetter } satisfies ApplyUrlResult);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Excel Upload ─────────────────────────────────────────────────────────────

app.post("/api/companies/upload", rawBody, (req: Request, res: Response) => {
  const buf = req.body as Buffer;

  if (!buf || buf.length === 0) {
    res.status(400).json({ error: "No file provided. Please upload an Excel file." });
    return;
  }

  try {
    const companies = parseCompaniesFromExcel(buf);
    const result = addCompaniesToProfile(companies);
    res.json({ ok: true, ...result, companies });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/companies/rank", async (_req: Request, res: Response) => {
  try {
    const profile = loadProfile();
    const ranked = await rankCompanies(profile);
    res.json(ranked);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/companies", (_req: Request, res: Response) => {
  try {
    res.json(getPreferredCompanies());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.patch("/api/companies/:name", (req: Request, res: Response) => {
  const nameParam = req.params.name;
  const companyName = decodeURIComponent(Array.isArray(nameParam) ? nameParam[0] : nameParam);
  const { liked, notes } = req.body as { liked?: boolean; notes?: string };

  try {
    const profile = loadProfile();
    const company = profile.preferredCompanies.find(
      (c) => c.name.toLowerCase() === companyName.toLowerCase()
    );

    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    if (liked !== undefined) {
      company.liked = liked;
    }
    if (notes !== undefined) {
      company.notes = notes;
    }

    saveProfile(profile);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete("/api/companies/:name", (req: Request, res: Response) => {
  const nameParam = req.params.name;
  const companyName = decodeURIComponent(Array.isArray(nameParam) ? nameParam[0] : nameParam);

  try {
    const profile = loadProfile();
    const initialLength = profile.preferredCompanies.length;
    profile.preferredCompanies = profile.preferredCompanies.filter(
      (c) => c.name.toLowerCase() !== companyName.toLowerCase()
    );

    if (profile.preferredCompanies.length === initialLength) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    saveProfile(profile);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Chat ─────────────────────────────────────────────────────────────────────

app.post("/api/chat", async (req: Request, res: Response) => {
  const { messages } = req.body as { messages?: ChatMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required." });
    return;
  }
  try {
    const reply = await chat(messages);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Error handler ────────────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

export default app;
