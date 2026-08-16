/**
 * Job board search — scrapes LinkedIn, MyJobMag, Indeed, Glassdoor, CWJobs, and Reed.
 * Targets junior and internship roles in software engineering, development, AI, and DevOps.
 */
import type { RawJob } from "./types.js";
import type { Profile } from "../profile/types.js";
import { crawlJobBoards } from "./crawler.js";

// ─── Search queries ───────────────────────────────────────────────────────────

/** Core job titles we always search for, covering the required disciplines. */
const BASE_QUERIES = [
  "junior software engineer",
  "junior software developer",
  "junior AI engineer",
  "junior DevOps engineer",
  "software engineering internship",
  "software developer internship",
  "AI engineering internship",
  "DevOps internship",
  "junior AI solutions engineer",
  "junior full stack developer",
];

// Keywords that must appear in title/description for a job to pass the junior/intern filter
const LEVEL_KEYWORDS = [
  "junior",
  "graduate",
  "entry level",
  "entry-level",
  "intern",
  "internship",
  "trainee",
  "apprentice",
  "associate",
  "jr.",
  "jr ",
];

// Job-domain keywords — at least one must appear
const DOMAIN_KEYWORDS = [
  "software engineer",
  "software developer",
  "software development",
  "ai engineer",
  "ai solution",
  "ai engineering",
  "machine learning",
  "devops",
  "dev ops",
  "cloud engineer",
  "backend",
  "back-end",
  "frontend",
  "front-end",
  "full stack",
  "fullstack",
  "full-stack",
  "web developer",
  "web development",
  "python developer",
  "java developer",
  "node.js",
];

// ─── Filters ─────────────────────────────────────────────────────────────────

/**
 * Keep only junior / internship roles within the target disciplines.
 * Rejects anything that looks senior, managerial, or unrelated.
 */
function filterToJuniorRoles(jobs: RawJob[]): RawJob[] {
  const seniorAnti = [
    "senior",
    "sr.",
    "sr ",
    "lead ",
    "principal",
    "staff ",
    "head of",
    "manager",
    "director",
    "architect",
    "vp ",
    "vice president",
    "cto",
    "chief",
  ];

  return jobs.filter((job) => {
    const text = `${job.title} ${job.description}`.toLowerCase();

    // Must have a junior/intern signal in the title (not just the description)
    const titleLower = job.title.toLowerCase();
    const hasLevelSignal = LEVEL_KEYWORDS.some((kw) => titleLower.includes(kw));
    if (!hasLevelSignal) return false;

    // Must relate to one of the target domains
    const hasDomain = DOMAIN_KEYWORDS.some((kw) => text.includes(kw));
    if (!hasDomain) return false;

    // Reject anything that looks senior/management
    const isSenior = seniorAnti.some((kw) => titleLower.includes(kw));
    return !isSenior;
  });
}

/** Deduplicate by URL so the same listing doesn't appear from two boards. */
function deduplicate(jobs: RawJob[]): RawJob[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    if (seen.has(j.url)) return false;
    seen.add(j.url);
    return true;
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Scrape all configured job boards for junior / internship roles.
 * Uses the profile's target locations; falls back to "London".
 * Returns pre-filtered, deduplicated raw jobs, excluding already-applied IDs.
 */
export async function fetchJobs(profile: Profile): Promise<RawJob[]> {
  const location = profile.targetLocations[0] ?? "London";

  // Run all queries in parallel across all boards
  const results = await Promise.all(
    BASE_QUERIES.map((query) => crawlJobBoards(query, location))
  );

  const allJobs: RawJob[] = results.flat();
  const unique = deduplicate(allJobs);
  const levelFiltered = filterToJuniorRoles(unique);

  // Remove already-applied jobs
  const appliedSet = new Set(profile.appliedJobIds);
  return levelFiltered.filter((j) => !appliedSet.has(j.id));
}
