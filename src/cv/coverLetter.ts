/**
 * Cover letter generator — produces a short, punchy, personalised cover letter.
 */
import Groq from "groq-sdk";
import type { ScoredJob } from "../jobs/types.js";
import type { Profile } from "../profile/types.js";

const client = new Groq(); // reads GROQ_API_KEY from env

function buildCoverLetterPrompt(profile: Profile, job: ScoredJob): string {
  return `You are an expert at writing job application cover letters.

## Candidate Profile
Name: ${profile.name}
Email: ${profile.email}
Location: ${profile.location}
Summary: ${profile.summary}

Match reasons for this role:
${job.matchReasons.map((r) => `- ${r}`).join("\n")}

## Job Details
Title: ${job.title}
Company: ${job.company}
Description excerpt:
${job.description.slice(0, 2000)}

## Instructions
Write a cover letter for this candidate applying to this role.
- Keep it to 3 short paragraphs (max 250 words total).
- Paragraph 1: Why them, why this company specifically.
- Paragraph 2: 1–2 concrete achievements from their experience that are most relevant.
- Paragraph 3: Enthusiasm, call to action.
- Tone: confident, direct, human — NOT corporate or sycophantic.
- Do NOT use phrases like "I am excited to apply" or "I believe I would be a great fit".
- Return ONLY the cover letter text, no subject line or greeting/sign-off boilerplate.`;
}

export async function generateCoverLetter(profile: Profile, job: ScoredJob): Promise<string> {
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: buildCoverLetterPrompt(profile, job) }],
    temperature: 0.5,
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}
