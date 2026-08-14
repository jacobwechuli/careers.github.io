import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Profile } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");
const PROFILE_PATH = join(DATA_DIR, "profile.json");

export function loadProfile(): Profile {
  if (!existsSync(PROFILE_PATH)) {
    throw new Error(
      `Profile not found at ${PROFILE_PATH}.\nCopy data/profile.example.json to data/profile.json and fill it in.`
    );
  }
  const raw = readFileSync(PROFILE_PATH, "utf-8");
  return JSON.parse(raw) as Profile;
}

export function saveProfile(profile: Profile): void {
  writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2));
}

/** Returns a compact plain-text CV summary for use in LLM prompts. */
export function profileToText(profile: Profile): string {
  const lines: string[] = [];

  lines.push(`NAME: ${profile.name}`);
  lines.push(`LOCATION: ${profile.location}`);
  lines.push(`SUMMARY: ${profile.summary}`);
  lines.push("");

  lines.push("SKILLS:");
  lines.push(`  Languages: ${profile.skills.languages.join(", ")}`);
  lines.push(`  Frameworks: ${profile.skills.frameworks.join(", ")}`);
  lines.push(`  Tools: ${profile.skills.tools.join(", ")}`);
  lines.push(`  Concepts: ${profile.skills.concepts.join(", ")}`);
  lines.push("");

  lines.push("EXPERIENCE:");
  for (const exp of profile.experience) {
    lines.push(`  ${exp.role} at ${exp.company} (${exp.startDate} – ${exp.endDate})`);
    for (const b of exp.bullets) lines.push(`    • ${b}`);
  }
  lines.push("");

  lines.push("EDUCATION:");
  for (const edu of profile.education) {
    lines.push(
      `  ${edu.degree} in ${edu.field} — ${edu.institution} (${edu.startYear}–${edu.endYear})`
    );
    if (edu.grade) lines.push(`    Grade: ${edu.grade}`);
  }
  lines.push("");

  lines.push("PROJECTS:");
  for (const proj of profile.projects) {
    lines.push(`  ${proj.name}: ${proj.description}`);
    lines.push(`    Tech: ${proj.tech.join(", ")}`);
    for (const h of proj.highlights) lines.push(`    • ${h}`);
  }

  return lines.join("\n");
}
