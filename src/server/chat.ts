/**
 * Career advisor chat endpoint.
 * Maintains a full conversation history per request and streams responses
 * from Groq using the llama-3.3-70b model with a career advisor system prompt.
 */
import Groq from "groq-sdk";
import { profileToText, loadProfile } from "../profile/profile.js";

const client = new Groq();

const SYSTEM_PROMPT = `You are an expert career advisor specialising in tech careers for junior and early-career candidates. You have deep knowledge of:
- Software engineering, AI/ML engineering, DevOps, and full-stack development career paths
- How to write strong CVs, cover letters, and LinkedIn profiles
- Interview preparation (technical and behavioural)
- How to evaluate job offers and negotiate salary
- Identifying the right companies and roles for someone's skill level
- UK and international tech job markets

The candidate you are advising is a junior-level software/AI/DevOps job seeker. Be direct, practical, and encouraging. Give specific, actionable advice. Do not be generic. If you have their CV context, reference it in your answers.`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Send a conversation to Groq and return the assistant's reply.
 * Automatically prepends the user's CV as context if a profile exists.
 */
export async function chat(messages: ChatMessage[]): Promise<string> {
  // Try to load the profile and prepend it as context
  let systemPrompt = SYSTEM_PROMPT;
  try {
    const profile = loadProfile();
    const cvText = profileToText(profile);
    systemPrompt += `\n\n## Candidate CV (for reference)\n${cvText}`;
  } catch {
    // No profile yet — proceed without CV context
  }

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    temperature: 0.6,
    max_tokens: 1024,
  });

  return completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
}
