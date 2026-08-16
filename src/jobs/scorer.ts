/**
 * LLM-based job scorer.
 * Sends the CV + job description to Groq and gets back a structured score.
 */
import Groq from "groq-sdk";
import { z } from "zod";
import type { RawJob, ScoredJob } from "./types.js";
import { profileToText } from "../profile/profile.js";
import type { Profile } from "../profile/types.js";

const client = new Groq(); // reads GROQ_API_KEY from env

// ─── Response schema ──────────────────────────────────────────────────────────

const ScoreResponseSchema = z.object({
  score: z.number().min(0).max(100),
  matchReasons: z.array(z.string()),
  missingSkills: z.array(z.string()),
  recommendation: z.enum(["apply", "skip", "stretch"]),
});

type ScoreResponse = z.infer<typeof ScoreResponseSchema>;

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildScoringPrompt(profileText: string, job: RawJob): string {
  return `You are a career advisor scoring a job posting against a candidate's CV.

## Candidate CV
${profileText}

## Job Posting
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
${job.salary ? `Salary: ${job.salary}` : ""}
Description:
${job.description.slice(0, 3000)}

## Task
Score how well the candidate matches this job. Return ONLY valid JSON matching this schema:
{
  "score": <integer 0-100>,
  "matchReasons": ["<reason 1>", "<reason 2>", ...],
  "missingSkills": ["<skill 1>", ...],
  "recommendation": "apply" | "skip" | "stretch"
}

Scoring guide:
- 80–100: Strong match, candidate should apply immediately
- 60–79: Good match, worth applying ("apply")
- 40–59: Possible stretch, some key gaps ("stretch")
- 0–39: Poor match, skip
"matchReasons" should be 2–4 concise bullets.
"missingSkills" should list only hard technical gaps, not soft skills.`;
}

// ─── Core scoring function ────────────────────────────────────────────────────

async function scoreOne(profileText: string, job: RawJob): Promise<ScoredJob> {
  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: buildScoringPrompt(profileText, job) }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = ScoreResponseSchema.parse(JSON.parse(raw));

    return { ...job, ...parsed };
  } catch (err) {
    // If scoring fails for one job, return a neutral result rather than crashing
    console.warn(`[scorer] Failed to score "${job.title}" at ${job.company}:`, err);
    return {
      ...job,
      score: 0,
      matchReasons: ["Scoring failed"],
      missingSkills: [],
      recommendation: "skip",
    };
  }
}

// ─── Batch scoring ────────────────────────────────────────────────────────────

/**
 * Scores all jobs concurrently with controlled concurrency to respect rate limits.
 * Uses a semaphore pattern to limit concurrent requests while processing all jobs in parallel.
 * Returns jobs sorted by score descending.
 */
export async function scoreJobs(jobs: RawJob[], profile: Profile): Promise<ScoredJob[]> {
  const profileText = profileToText(profile);
  const CONCURRENCY = 5;
  const results: ScoredJob[] = new Array(jobs.length);

  // Process jobs with controlled concurrency using a sliding window
  let currentIndex = 0;

  async function processNext(): Promise<void> {
    while (currentIndex < jobs.length) {
      const index = currentIndex++;
      results[index] = await scoreOne(profileText, jobs[index]);
    }
  }

  // Start CONCURRENCY workers to process jobs
  const workers = Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () =>
    processNext()
  );

  await Promise.all(workers);
  return results.sort((a, b) => b.score - a.score);
}
