/**
 * AI-powered company ranker.
 * Sends the user's CV + their target company list to Groq and gets back
 * a ranked list with a suitability score and reasoning for each company.
 */
import Groq from "groq-sdk";
import { z } from "zod";
import { profileToText } from "../profile/profile.js";
import type { Profile, CompanyPreference } from "../profile/types.js";

const client = new Groq();

// ─── Schema ───────────────────────────────────────────────────────────────────

const RankedCompanySchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  reason: z.string(),
  roleTypes: z.array(z.string()),  // types of junior/internship roles likely available
});

const RankResponseSchema = z.object({
  companies: z.array(RankedCompanySchema),
});

export type RankedCompany = z.infer<typeof RankedCompanySchema> & {
  careerPage?: string;
  openRemoteJobs?: number;
  liked: boolean;
};

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(profileText: string, companies: CompanyPreference[]): string {
  const companyList = companies
    .map((c, i) => {
      const parts = [`${i + 1}. ${c.name}`];
      if (c.openRemoteJobs !== undefined) parts.push(`(${c.openRemoteJobs} open remote jobs)`);
      if (c.notes) parts.push(`— ${c.notes}`);
      return parts.join(" ");
    })
    .join("\n");

  return `You are a career advisor helping a junior software/AI/DevOps candidate find the most suitable companies to target.

## Candidate CV
${profileText}

## Target Companies
${companyList}

## Task
Rank EVERY company in the list by how suitable it is for this specific candidate, focusing on:
- Likelihood of having junior, graduate, internship, or entry-level roles in software engineering, AI, or DevOps
- Match between the candidate's skills/background and the company's known tech stack or domain
- Number of open remote jobs (higher is better, if provided)
- Company size and culture fit for early-career candidates

Return ONLY valid JSON matching this exact schema — include all companies, no extras:
{
  "companies": [
    {
      "name": "<exact company name from the list>",
      "score": <integer 0-100>,
      "reason": "<one sentence why this company suits or doesn't suit the candidate>",
      "roleTypes": ["<role type 1>", "<role type 2>"]
    }
  ]
}

Sort the array by score descending. "roleTypes" should list 1–3 specific role types the candidate could realistically apply for at this company (e.g. "Junior Backend Engineer", "AI Internship", "DevOps Graduate Scheme").`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Rank all preferred companies in the profile against the candidate's CV.
 * Returns companies sorted by AI suitability score descending.
 */
export async function rankCompanies(profile: Profile): Promise<RankedCompany[]> {
  const companies = profile.preferredCompanies;
  if (companies.length === 0) return [];

  const profileText = profileToText(profile);

  // Groq context window is large enough for ~500 companies comfortably.
  // If the list is very large, batch into groups of 100.
  const BATCH_SIZE = 100;
  const batches: CompanyPreference[][] = [];
  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    batches.push(companies.slice(i, i + BATCH_SIZE));
  }

  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const completion = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: buildPrompt(profileText, batch) }],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? '{"companies":[]}';
      const parsed = RankResponseSchema.parse(JSON.parse(raw));

      // Merge AI scores back with the stored profile data (careerPage, openRemoteJobs, liked)
      return parsed.companies.map((ranked) => {
        const stored = batch.find(
          (c) => c.name.toLowerCase() === ranked.name.toLowerCase()
        );
        return {
          ...ranked,
          careerPage: stored?.careerPage,
          openRemoteJobs: stored?.openRemoteJobs,
          liked: stored?.liked ?? false,
        } satisfies RankedCompany;
      });
    })
  );

  // Flatten batches and re-sort by score since batches were ranked independently
  return batchResults.flat().sort((a, b) => b.score - a.score);
}
