/**
 * Web crawler for job boards without public APIs.
 * Scrapes LinkedIn, Indeed, Glassdoor, and other major job sites.
 */
import fetch from "node-fetch";
import type { RawJob } from "./types.js";

// Pre-compiled regex patterns for performance
const SCRIPT_REGEX = /<script[\s\S]*?<\/script>/gi;
const STYLE_REGEX = /<style[\s\S]*?<\/style>/gi;
const BR_REGEX = /<br\s*\/?>/gi;
const BLOCK_TAG_REGEX = /<\/?(p|li|div|h\d|section|article)[^>]*>/gi;
const HTML_TAG_REGEX = /<[^>]+>/g;
const NBSP_REGEX = /&nbsp;/g;
const AMP_REGEX = /&amp;/g;
const LT_REGEX = /&lt;/g;
const GT_REGEX = /&gt;/g;

/** Strip HTML tags into plain text */
function htmlToText(html: string): string {
  return html
    .replace(SCRIPT_REGEX, "")
    .replace(STYLE_REGEX, "")
    .replace(BR_REGEX, "\n")
    .replace(BLOCK_TAG_REGEX, "\n")
    .replace(HTML_TAG_REGEX, " ")
    .replace(NBSP_REGEX, " ")
    .replace(AMP_REGEX, "&")
    .replace(LT_REGEX, "<")
    .replace(GT_REGEX, ">")
    .trim();
}

/** Extract job listings from LinkedIn search results page */
async function scrapeLinkedIn(query: string, location: string): Promise<RawJob[]> {
  const encodedQuery = encodeURIComponent(query);
  const encodedLocation = encodeURIComponent(location);
  const url = `https://www.linkedin.com/jobs/search?keywords=${encodedQuery}&location=${encodedLocation}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) {
      console.warn(`[crawler] LinkedIn returned ${res.status} — skipping`);
      return [];
    }

    const html = await res.text();
    const jobs: RawJob[] = [];
    
    // Parse LinkedIn job cards from search results
    // Note: LinkedIn uses dynamic class names, so we use pattern matching
    const jobCardRegex = /data-job-id="(\d+)".*?>([^<]+)<\/a>.*?>([^<]+)<\/a>.*?>([^<]+)</gis;
    let match;
    let count = 0;
    
    while ((match = jobCardRegex.exec(html)) !== null && count < 15) {
      const [, id, title, company, loc] = match;
      if (title && company) {
        jobs.push({
          id: `linkedin-${id}`,
          title: htmlToText(title).trim(),
          company: htmlToText(company).trim(),
          location: htmlToText(loc).trim() || location,
          description: "", // Will be fetched individually
          url: `https://www.linkedin.com/jobs/view/${id}`,
          postedAt: new Date().toISOString().slice(0, 10),
          source: "linkedin" as const,
        });
        count++;
      }
    }

    return jobs;
  } catch (error) {
    console.warn("[crawler] LinkedIn scraping failed:", error);
    return [];
  }
}

/** Extract job listings from Indeed search results */
async function scrapeIndeed(query: string, location: string): Promise<RawJob[]> {
  const encodedQuery = encodeURIComponent(query);
  const encodedLocation = encodeURIComponent(location);
  const url = `https://uk.indeed.com/jobs?q=${encodedQuery}&l=${encodedLocation}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    });

    if (!res.ok) {
      console.warn(`[crawler] Indeed returned ${res.status} — skipping`);
      return [];
    }

    const html = await res.text();
    const jobs: RawJob[] = [];

    // Extract job cards using Indeed's data attributes
    const jobCardRegex = /data-jk="([^"]+)".*?jobTitle[^>]*>([^<]+).*?companyName[^>]*>([^<]+).*?jobLocation[^>]*>([^<]+)/gis;
    let match;
    let count = 0;

    while ((match = jobCardRegex.exec(html)) !== null && count < 15) {
      const [, id, title, company, loc] = match;
      if (title && company) {
        jobs.push({
          id: `indeed-${id}`,
          title: htmlToText(title).trim(),
          company: htmlToText(company).trim(),
          location: htmlToText(loc).trim() || location,
          description: "",
          url: `https://uk.indeed.com/viewjob?jk=${id}`,
          postedAt: new Date().toISOString().slice(0, 10),
          source: "indeed" as const,
        });
        count++;
      }
    }

    return jobs;
  } catch (error) {
    console.warn("[crawler] Indeed scraping failed:", error);
    return [];
  }
}

/** Extract job listings from Glassdoor search results */
async function scrapeGlassdoor(query: string, location: string): Promise<RawJob[]> {
  const encodedQuery = encodeURIComponent(query);
  const encodedLocation = encodeURIComponent(location);
  const url = `https://www.glassdoor.co.uk/Job/${encodedLocation}-${encodedQuery}-jobs-SRCH_IL.0,${encodedLocation.length + 1}_KO${encodedLocation.length + 2},${encodedLocation.length + 2 + query.length}.htm`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    });

    if (!res.ok) {
      console.warn(`[crawler] Glassdoor returned ${res.status} — skipping`);
      return [];
    }

    const html = await res.text();
    const jobs: RawJob[] = [];

    // Glassdoor job listing extraction
    const jobRegex = /data-job-id="(\d+)".*?jobTitle[^>]*>([^<]+).*?data-company-name="([^"]*)".*?>([^<]+)</gis;
    let match;
    let count = 0;

    while ((match = jobRegex.exec(html)) !== null && count < 15) {
      const [, id, title, company, loc] = match;
      if (title && company) {
        jobs.push({
          id: `glassdoor-${id}`,
          title: htmlToText(title).trim(),
          company: htmlToText(company).trim(),
          location: htmlToText(loc).trim() || location,
          description: "",
          url: `https://www.glassdoor.co.uk/job-listing/JV_IC?jobId=${id}`,
          postedAt: new Date().toISOString().slice(0, 10),
          source: "glassdoor" as const,
        });
        count++;
      }
    }

    return jobs;
  } catch (error) {
    console.warn("[crawler] Glassdoor scraping failed:", error);
    return [];
  }
}

/** Extract job listings from CWJobs (UK tech jobs) */
async function scrapeCWJobs(query: string, location: string): Promise<RawJob[]> {
  const encodedQuery = encodeURIComponent(query);
  const encodedLocation = encodeURIComponent(location);
  const url = `https://www.cwjobs.co.uk/jobs/${encodedLocation}/${encodedQuery}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    });

    if (!res.ok) {
      console.warn(`[crawler] CWJobs returned ${res.status} — skipping`);
      return [];
    }

    const html = await res.text();
    const jobs: RawJob[] = [];

    // CWJobs job card extraction
    const jobRegex = /data-job-id="([^"]+)".*?class="job-title"[^>]*>([^<]+).*?class="company"[^>]*>([^<]+).*?class="location"[^>]*>([^<]+)/gis;
    let match;
    let count = 0;

    while ((match = jobRegex.exec(html)) !== null && count < 15) {
      const [, id, title, company, loc] = match;
      if (title && company) {
        jobs.push({
          id: `cwjobs-${id}`,
          title: htmlToText(title).trim(),
          company: htmlToText(company).trim(),
          location: htmlToText(loc).trim() || location,
          description: "",
          url: `https://www.cwjobs.co.uk/job/${id}`,
          postedAt: new Date().toISOString().slice(0, 10),
          source: "cwjobs" as const,
        });
        count++;
      }
    }

    return jobs;
  } catch (error) {
    console.warn("[crawler] CWJobs scraping failed:", error);
    return [];
  }
}

/** Extract job listings from Reed (UK general jobs) */
async function scrapeReed(query: string, location: string): Promise<RawJob[]> {
  const encodedQuery = encodeURIComponent(query);
  const encodedLocation = encodeURIComponent(location);
  const url = `https://www.reed.co.uk/jobs/${encodedQuery}-jobs-in-${encodedLocation.replace(/\s+/g, "-").toLowerCase()}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    });

    if (!res.ok) {
      console.warn(`[crawler] Reed returned ${res.status} — skipping`);
      return [];
    }

    const html = await res.text();
    const jobs: RawJob[] = [];

    // Reed job card extraction
    const jobRegex = /data-jobid="([^"]+)".*?class="job-title"[^>]*>([^<]+).*?class="grid-separator"[^>]*>([^<]+).*?class="location"[^>]*>([^<]+)/gis;
    let match;
    let count = 0;

    while ((match = jobRegex.exec(html)) !== null && count < 15) {
      const [, id, title, company, loc] = match;
      if (title && company) {
        jobs.push({
          id: `reed-${id}`,
          title: htmlToText(title).trim(),
          company: htmlToText(company).trim(),
          location: htmlToText(loc).trim() || location,
          description: "",
          url: `https://www.reed.co.uk/jobs/${id}`,
          postedAt: new Date().toISOString().slice(0, 10),
          source: "reed" as const,
        });
        count++;
      }
    }

    return jobs;
  } catch (error) {
    console.warn("[crawler] Reed scraping failed:", error);
    return [];
  }
}

/** Fetch full job description from individual job page */
async function fetchJobDescription(job: RawJob): Promise<RawJob> {
  try {
    const res = await fetch(job.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    });

    if (!res.ok) {
      return job;
    }

    const html = await res.text();
    const text = htmlToText(html);
    
    // Extract description section (limit to reasonable length)
    const MAX_DESC_LENGTH = 3000;
    job.description = text.slice(0, MAX_DESC_LENGTH);
    
    return job;
  } catch (error) {
    console.warn(`[crawler] Failed to fetch description for ${job.url}:`, error);
    return job;
  }
}

/**
 * Crawl multiple job boards for a given role and location.
 * Returns raw job listings with basic info (descriptions fetched later).
 */
export async function crawlJobBoards(query: string, location: string): Promise<RawJob[]> {
  console.log(`[crawler] Searching for "${query}" in ${location}...`);

  // Crawl all boards in parallel
  const [linkedIn, indeed, glassdoor, cwjobs, reed] = await Promise.all([
    scrapeLinkedIn(query, location),
    scrapeIndeed(query, location),
    scrapeGlassdoor(query, location),
    scrapeCWJobs(query, location),
    scrapeReed(query, location),
  ]);

  const allJobs = [...linkedIn, ...indeed, ...glassdoor, ...cwjobs, ...reed];
  
  console.log(`[crawler] Found ${allJobs.length} total jobs from web crawling`);
  
  return allJobs;
}

/**
 * Crawl job boards and enrich with descriptions for top matches.
 */
export async function crawlAndEnrichJobs(
  query: string,
  location: string,
  maxDescriptions = 10
): Promise<RawJob[]> {
  const jobs = await crawlJobBoards(query, location);
  
  if (jobs.length === 0) {
    return [];
  }

  // Fetch descriptions for top N jobs to save time
  const jobsWithDescriptions = await Promise.all(
    jobs.slice(0, maxDescriptions).map(fetchJobDescription)
  );

  // Keep remaining jobs without descriptions (will be fetched on-demand)
  const remainingJobs = jobs.slice(maxDescriptions);

  return [...jobsWithDescriptions, ...remainingJobs];
}
