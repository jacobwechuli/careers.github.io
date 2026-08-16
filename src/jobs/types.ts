/** A raw job posting fetched from a job board. */
export interface RawJob {
  id: string; // board-prefixed, e.g. "adzuna-123"
  title: string;
  company: string;
  location: string;
  salary?: string; // free-text as returned by the board
  description: string; // full text
  url: string;
  postedAt: string; // ISO date
  source: "adzuna" | "remotive" | "greenhouse" | "linkedin" | "indeed" | "glassdoor" | "cwjobs" | "reed";
}

/** A job that has been scored against the user's profile. */
export interface ScoredJob extends RawJob {
  score: number; // 0–100
  matchReasons: string[]; // bullet points explaining the match
  missingSkills: string[]; // skills in the JD the user lacks
  recommendation: "apply" | "skip" | "stretch";
}
