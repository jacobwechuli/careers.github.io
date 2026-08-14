/**
 * CV text → structured Profile extractor.
 *
 * Takes raw CV text (pasted or extracted from a document) and asks Groq
 * to map it onto the Profile schema. Preserves any existing appliedJobIds
 * and preferredCompanies so they are not wiped on re-parse.
 */
import Groq from "groq-sdk";
import type { Profile } from "./types.js";

const client = new Groq();

function buildParsePrompt(cvText: string): string {
  return `You are a CV parser. Extract structured data from the CV text below and return it as valid JSON matching the schema exactly.

## CV Text
${cvText.slice(0, 6000)}

## Required JSON Schema
Return ONLY valid JSON — no markdown fences, no comments:
{
  "name": "<full name>",
  "email": "<email address>",
  "phone": "<phone number or empty string>",
  "location": "<city, country>",
  "linkedin": "<linkedin URL or empty string>",
  "github": "<github URL or empty string>",
  "portfolio": "<portfolio URL or empty string>",
  "summary": "<2-3 sentence professional summary derived from the CV>",
  "education": [
    {
      "institution": "<university or school name>",
      "degree": "<degree type e.g. BSc, MSc, BA>",
      "field": "<subject / field of study>",
      "startYear": <number>,
      "endYear": <number or "present">,
      "grade": "<grade or classification if present, else omit>",
      "highlights": ["<notable achievement>"]
    }
  ],
  "experience": [
    {
      "company": "<company name>",
      "role": "<job title>",
      "startDate": "<YYYY-MM>",
      "endDate": "<YYYY-MM or 'present'>",
      "bullets": ["<achievement or responsibility>"],
      "skills": ["<technology or skill used in this role>"]
    }
  ],
  "projects": [
    {
      "name": "<project name>",
      "description": "<one sentence description>",
      "tech": ["<technology>"],
      "url": "<url if present>",
      "highlights": ["<key achievement>"]
    }
  ],
  "skills": {
    "languages": ["<programming language>"],
    "frameworks": ["<framework or library>"],
    "tools": ["<tool or platform>"],
    "concepts": ["<concept or methodology>"]
  },
  "targetRoles": [
    {
      "title": "<most likely target job title based on the CV>",
      "keywords": ["<relevant keyword>"],
      "antiKeywords": []
    }
  ],
  "targetLocations": ["<location from CV or 'Remote'>"],
  "salaryMin": null,
  "preferredCompanies": [],
  "appliedJobIds": []
}

Rules:
- Use empty arrays [] when a section has no entries, never null.
- Use empty string "" for optional string fields with no data, never null.
- startDate / endDate must be "YYYY-MM" format — estimate the month as "01" if not given.
- Extract ALL experience and education entries, do not summarise or drop any.
- For skills, categorise carefully: languages = programming languages only, frameworks = libraries/frameworks, tools = dev tools/platforms/cloud, concepts = patterns/methodologies.
- targetRoles should reflect what this person would realistically apply for based on their experience.`;
}

export async function parseProfileFromText(
  cvText: string,
  existing?: Partial<Pick<Profile, "appliedJobIds" | "preferredCompanies" | "targetRoles" | "targetLocations" | "salaryMin">>
): Promise<Profile> {
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: buildParsePrompt(cvText) }],
    temperature: 0,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Profile;

  // Preserve job-tracking state from existing profile
  if (existing?.appliedJobIds?.length) {
    parsed.appliedJobIds = existing.appliedJobIds;
  }
  if (existing?.preferredCompanies?.length) {
    parsed.preferredCompanies = existing.preferredCompanies;
  }
  // Preserve user-set preferences if they exist
  if (existing?.targetRoles?.length) {
    parsed.targetRoles = existing.targetRoles;
  }
  if (existing?.targetLocations?.length) {
    parsed.targetLocations = existing.targetLocations;
  }
  if (existing?.salaryMin !== undefined && existing.salaryMin !== null) {
    parsed.salaryMin = existing.salaryMin;
  }

  return parsed;
}
