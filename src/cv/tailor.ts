/**
 * CV tailoring — takes the base CV and a specific job posting, and asks Groq
 * to rewrite the summary + select the most relevant bullets.
 */
import Groq from "groq-sdk";
import type { ScoredJob } from "../jobs/types.js";
import type { Profile } from "../profile/types.js";

const client = new Groq(); // reads GROQ_API_KEY from env

export interface TailoredCV {
  summary: string; // rewritten personal summary
  highlightedBullets: string[]; // top 5-6 most relevant experience bullets
  skillsToEmphasise: string[]; // skills to lead with for this role
}

function buildTailorPrompt(profile: Profile, job: ScoredJob): string {
  const allBullets = profile.experience.flatMap((e) =>
    e.bullets.map((b) => `[${e.role} @ ${e.company}] ${b}`)
  );

  return `You are a professional CV writer. Tailor the following CV for the given job posting.

## Original CV Summary
${profile.summary}

## Experience Bullets
${allBullets.join("\n")}

## All Skills
Languages: ${profile.skills.languages.join(", ")}
Frameworks: ${profile.skills.frameworks.join(", ")}
Tools: ${profile.skills.tools.join(", ")}
Concepts: ${profile.skills.concepts.join(", ")}

## Job Posting
Title: ${job.title}
Company: ${job.company}
Description:
${job.description.slice(0, 3000)}

## Task
Return ONLY valid JSON:
{
  "summary": "<rewritten 3-sentence summary tailored to this role>",
  "highlightedBullets": ["<5-6 most relevant bullets from the list, verbatim or lightly edited>"],
  "skillsToEmphasise": ["<5-8 skills to lead with on the CV for this role>"]
}`;
}

export async function tailorCV(profile: Profile, job: ScoredJob): Promise<TailoredCV> {
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: buildTailorPrompt(profile, job) }],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as TailoredCV;
}
