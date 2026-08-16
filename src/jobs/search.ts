/**
 * Job board search — Adzuna (UK) + Remotive (remote-only) + Web Crawler.
 *
 * Required env vars:
 *   ADZUNA_APP_ID   — from developer.adzuna.com
 *   ADZUNA_APP_KEY
 */
import fetch from "node-fetch";
import type { RawJob } from "./types.js";
import type { Profile } from "../profile/types.js";
import { crawlAndEnrichJobs } from "./crawler.js";

// ─── Adzuna ──────────────────────────────────────────────────────────────────

interface AdzunaResult {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  salary_min?: number;
  salary_max?: number;
  description: string;
  redirect_url: string;
  created: string;
}

interface AdzunaResponse {
  results: AdzunaResult[];
}

async function searchAdzuna(query: string, location: string, maxResults = 20): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.warn("[search] ADZUNA_APP_ID / ADZUNA_APP_KEY not set — skipping Adzuna");
    return [];
  }

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(maxResults),
    what: query,
    where: location,
    content_type: "application/json",
  });

  const url = `https://api.adzuna.com/v1/api/jobs/gb/search/1?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[search] Adzuna returned ${res.status} — skipping`);
    return [];
  }

  const data = (await res.json()) as AdzunaResponse;
  return data.results.map((r) => ({
    id: `adzuna-${r.id}`,
    title: r.title,
    company: r.company.display_name,
    location: r.location.display_name,
    salary:
      r.salary_min && r.salary_max
        ? `£${r.salary_min.toLocaleString()} – £${r.salary_max.toLocaleString()}`
        : undefined,
    description: r.description,
    url: r.redirect_url,
    postedAt: r.created.slice(0, 10),
    source: "adzuna" as const,
  }));
}

// ─── Remotive ─────────────────────────────────────────────────────────────────

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  candidate_required_location: string;
  salary: string;
  description: string;
  publication_date: string;
}

interface RemotiveResponse {
  jobs: RemotiveJob[];
}

async function searchRemotive(query: string): Promise<RawJob[]> {
  const params = new URLSearchParams({ search: query, limit: "20" });
  const res = await fetch(`https://remotive.com/api/remote-jobs?${params}`);
  if (!res.ok) {
    console.warn(`[search] Remotive returned ${res.status} — skipping`);
    return [];
  }
  const data = (await res.json()) as RemotiveResponse;
  return data.jobs.map((r) => ({
    id: `remotive-${r.id}`,
    title: r.title,
    company: r.company_name,
    location: r.candidate_required_location || "Remote",
    salary: r.salary || undefined,
    description: stripHtml(r.description),
    url: r.url,
    postedAt: r.publication_date.slice(0, 10),
    source: "remotive" as const,
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Pre-compiled regex patterns for HTML stripping
const STRIP_BR_REGEX = /<br\s*\/?>/gi;
const STRIP_BLOCK_REGEX = /<\/?(p|li|div|h\d)[^>]*>/gi;
const STRIP_TAG_REGEX = /<[^>]+>/g;
const STRIP_NBSP_REGEX = /&nbsp;/g;
const STRIP_AMP_REGEX = /&amp;/g;
const STRIP_LT_REGEX = /&lt;/g;
const STRIP_GT_REGEX = /&gt;/g;
const STRIP_NEWLINE_REGEX = /\n{3,}/g;

/** Very lightweight HTML tag stripper for job descriptions. */
function stripHtml(html: string): string {
  return html
    .replace(STRIP_BR_REGEX, "\n")
    .replace(STRIP_BLOCK_REGEX, "\n")
    .replace(STRIP_TAG_REGEX, "")
    .replace(STRIP_NBSP_REGEX, " ")
    .replace(STRIP_AMP_REGEX, "&")
    .replace(STRIP_LT_REGEX, "<")
    .replace(STRIP_GT_REGEX, ">")
    .replace(STRIP_NEWLINE_REGEX, "\n\n")
    .trim();
}

/** Deduplicate by URL so the same listing doesn't appear from two sources. */
function deduplicate(jobs: RawJob[]): RawJob[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    if (seen.has(j.url)) return false;
    seen.add(j.url);
    return true;
  });
}

/**
 * Hard-filter jobs before they reach the LLM scorer.
 * Rejects if the title or description contains any anti-keywords,
 * and rejects if none of the must-have keywords appear at all.
 */
function preFilter(jobs: RawJob[], profile: Profile): RawJob[] {
  // Pre-compute lowercase keywords for faster matching
  const roleFilters = profile.targetRoles.map((role) => ({
    keywords: role.keywords.map((k) => k.toLowerCase()),
    antiKeywords: (role.antiKeywords ?? []).map((k) => k.toLowerCase()),
  }));

  return jobs.filter((job) => {
    const text = `${job.title} ${job.description}`.toLowerCase();

    // Must match at least one target role
    return roleFilters.some((filter) => {
      const hasKeyword = filter.keywords.some((kw) => text.includes(kw));
      if (!hasKeyword) return false;
      const hasAnti = filter.antiKeywords.some((kw) => text.includes(kw));
      return !hasAnti;
    });
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch fresh job listings for every target role from all configured boards.
 * Returns pre-filtered, deduplicated raw jobs, excluding already-applied IDs.
 */
export async function fetchJobs(profile: Profile): Promise<RawJob[]> {
  const location = profile.targetLocations[0] ?? "London";

  // Fetch all roles in parallel instead of sequentially
  const fetchPromises = profile.targetRoles.map((role) => {
    const query = role.title;
    return Promise.all([
      searchAdzuna(query, location),
      searchRemotive(query),
      crawlAndEnrichJobs(query, location, 5), // Crawl web for top 5 per role
    ]);
  });

  const results = await Promise.all(fetchPromises);
  const allJobs: RawJob[] = results.flatMap(([adzunaJobs, remotiveJobs, crawledJobs]) => [
    ...adzunaJobs,
    ...remotiveJobs,
    ...crawledJobs,
  ]);

  const unique = deduplicate(allJobs);
  const filtered = preFilter(unique, profile);

  // Remove already-applied jobs using a Set for O(1) lookup
  const appliedSet = new Set(profile.appliedJobIds);
  return filtered.filter((j) => !appliedSet.has(j.id));
}
