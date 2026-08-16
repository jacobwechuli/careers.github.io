/**
 * Job page scraper.
 *
 * Fetches the raw HTML of a job posting URL, strips it to plain text,
 * then asks Groq to extract a structured RawJob from the content.
 */
import fetch from "node-fetch";
import Groq from "groq-sdk";
import type { RawJob } from "./types.js";

const client = new Groq();

// Pre-compiled regex patterns for better performance
const SCRIPT_REGEX = /<script[\s\S]*?<\/script>/gi;
const STYLE_REGEX = /<style[\s\S]*?<\/style>/gi;
const BR_REGEX = /<br\s*\/?>/gi;
const BLOCK_TAG_REGEX = /<\/?(p|li|div|h\d|section|article)[^>]*>/gi;
const HTML_TAG_REGEX = /<[^>]+>/g;
const NBSP_REGEX = /&nbsp;/g;
const AMP_REGEX = /&amp;/g;
const LT_REGEX = /&lt;/g;
const GT_REGEX = /&gt;/g;
const QUOT_REGEX = /&quot;/g;
const APOS_REGEX = /&#39;/g;
const WHITESPACE_REGEX = /[ \t]+/g;
const NEWLINE_REGEX = /\n{3,}/g;

/** Strip HTML tags and collapse whitespace into readable plain text. */
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
    .replace(QUOT_REGEX, '"')
    .replace(APOS_REGEX, "'")
    .replace(WHITESPACE_REGEX, " ")
    .replace(NEWLINE_REGEX, "\n\n")
    .trim();
}

/** Extract structured job data from raw page text using the LLM. */
async function extractJobFromText(pageText: string, url: string): Promise<RawJob> {
  // Limit page text to reduce token usage while preserving key info
  const MAX_CHARS = 4000;
  const truncatedText = pageText.length > MAX_CHARS ? pageText.slice(0, MAX_CHARS) : pageText;

  const prompt = `You are a job posting parser. Extract structured data from the following job page text.

URL: ${url}

Page content:
${truncatedText}

Return ONLY valid JSON with this exact schema — no extra fields, no markdown:
{
  "title": "<job title>",
  "company": "<company name>",
  "location": "<location or 'Remote'>",
  "salary": "<salary range or null>",
  "description": "<full job description text, preserve as much detail as possible>"
}

If a field cannot be determined, use an empty string (not null) except for salary which can be null.`;

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as {
    title: string;
    company: string;
    location: string;
    salary: string | null;
    description: string;
  };

  // Build a stable ID from the URL
  const id = `manual-${Buffer.from(url).toString("base64").slice(0, 16)}`;

  return {
    id,
    title: parsed.title || "Unknown Title",
    company: parsed.company || "Unknown Company",
    location: parsed.location || "Unknown",
    salary: parsed.salary ?? undefined,
    description: parsed.description || truncatedText,
    url,
    postedAt: new Date().toISOString().slice(0, 10),
    source: "greenhouse" as const, // generic manual source
  };
}

/**
 * Fetches a job posting URL and returns a structured RawJob.
 * Throws if the page cannot be fetched or parsed.
 */
export async function scrapeJobUrl(url: string): Promise<RawJob> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,*/*",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch job page: HTTP ${res.status} from ${url}`);
  }

  const html = await res.text();
  const text = htmlToText(html);

  if (text.length < 100) {
    throw new Error("Page content too short — the URL may require a login or is behind a paywall.");
  }

  return extractJobFromText(text, url);
}
