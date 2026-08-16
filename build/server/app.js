import express from "express";
import cors from "cors";
import { loadAppliedJobs, updateStatus, recordApplication } from "../jobs/tracker.js";
import { getDueFollowUps } from "../jobs/tracker.js";
import { runMorning } from "../agent/morning.js";
import { scrapeJobUrl } from "../jobs/scraper.js";
import { scoreJobs } from "../jobs/scorer.js";
import { tailorCV } from "../cv/tailor.js";
import { generateCoverLetter } from "../cv/coverLetter.js";
import { loadProfile, saveProfile } from "../profile/profile.js";
import { parseProfileFromText } from "../profile/parser.js";
import { parseCompaniesFromExcel, addCompaniesToProfile, getPreferredCompanies } from "../jobs/excelParser.js";
const app = express();
app.use(cors());
app.use(express.json());
// ─── Applications ─────────────────────────────────────────────────────────────
app.get("/api/applications", (_req, res) => {
    res.json(loadAppliedJobs());
});
app.patch("/api/applications/:id", (req, res) => {
    const id = req.params["id"];
    const { status, notes } = req.body;
    const valid = [
        "applied", "screening", "interview", "offer", "rejected", "ghosted",
    ];
    if (!valid.includes(status)) {
        res.status(400).json({ error: `Invalid status. Choose from: ${valid.join(", ")}` });
        return;
    }
    try {
        updateStatus(id, status, notes);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(404).json({ error: err.message });
    }
});
// ─── Reminders ────────────────────────────────────────────────────────────────
app.get("/api/reminders", (_req, res) => {
    res.json(getDueFollowUps());
});
// ─── Morning run ──────────────────────────────────────────────────────────────
let runInProgress = false;
app.post("/api/run", async (_req, res) => {
    if (runInProgress) {
        res.status(409).json({ error: "A morning run is already in progress" });
        return;
    }
    runInProgress = true;
    try {
        await runMorning();
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
    finally {
        runInProgress = false;
    }
});
app.get("/api/run/status", (_req, res) => {
    res.json({ running: runInProgress });
});
// ─── Profile ──────────────────────────────────────────────────────────────────
app.get("/api/profile", (_req, res) => {
    try {
        res.json(loadProfile());
    }
    catch {
        // Profile doesn't exist yet — return null so the UI knows to prompt setup
        res.json(null);
    }
});
app.put("/api/profile", (req, res) => {
    const profile = req.body;
    if (!profile?.name) {
        res.status(400).json({ error: "Profile must include at least a name." });
        return;
    }
    saveProfile(profile);
    res.json({ ok: true });
});
app.post("/api/profile/parse", async (req, res) => {
    const { text } = req.body;
    if (!text || text.trim().length < 50) {
        res.status(400).json({ error: "CV text is too short to parse." });
        return;
    }
    try {
        // Preserve existing job-tracking data across re-parses
        let existing = {};
        try {
            const current = loadProfile();
            existing = {
                appliedJobIds: current.appliedJobIds,
                preferredCompanies: current.preferredCompanies,
                targetRoles: current.targetRoles,
                targetLocations: current.targetLocations,
                salaryMin: current.salaryMin,
            };
        }
        catch { /* no profile yet — fine */ }
        const profile = await parseProfileFromText(text, existing);
        res.json(profile);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post("/api/apply-url", async (req, res) => {
    const { url } = req.body;
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
        res.json({ job: scored, tailoredCV: tailored, coverLetter });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── Excel Upload ─────────────────────────────────────────────────────────────
app.post("/api/companies/upload", (req, res) => {
    const fileBuffer = req.body.fileBuffer;
    if (!fileBuffer) {
        res.status(400).json({ error: "No file provided. Please upload an Excel file." });
        return;
    }
    try {
        const companies = parseCompaniesFromExcel(fileBuffer);
        const result = addCompaniesToProfile(companies);
        res.json({ ok: true, ...result, companies });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get("/api/companies", (_req, res) => {
    try {
        res.json(getPreferredCompanies());
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.patch("/api/companies/:name", (req, res) => {
    const nameParam = req.params.name;
    const companyName = decodeURIComponent(Array.isArray(nameParam) ? nameParam[0] : nameParam);
    const { liked, notes } = req.body;
    try {
        const profile = loadProfile();
        const company = profile.preferredCompanies.find((c) => c.name.toLowerCase() === companyName.toLowerCase());
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete("/api/companies/:name", (req, res) => {
    const nameParam = req.params.name;
    const companyName = decodeURIComponent(Array.isArray(nameParam) ? nameParam[0] : nameParam);
    try {
        const profile = loadProfile();
        const initialLength = profile.preferredCompanies.length;
        profile.preferredCompanies = profile.preferredCompanies.filter((c) => c.name.toLowerCase() !== companyName.toLowerCase());
        if (profile.preferredCompanies.length === initialLength) {
            res.status(404).json({ error: "Company not found" });
            return;
        }
        saveProfile(profile);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
});
export default app;
