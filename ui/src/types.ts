// ─── Profile types (mirrors src/profile/types.ts exactly) ────────────────────

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startYear: number;
  endYear: number | "present";
  grade?: string;
  highlights?: string[];
}

export interface WorkExperience {
  company: string;
  role: string;
  startDate: string;
  endDate: string | "present";
  bullets: string[];
  skills: string[];
}

export interface Project {
  name: string;
  description: string;
  tech: string[];
  url?: string;
  highlights: string[];
}

export interface TargetRole {
  title: string;
  keywords: string[];
  antiKeywords?: string[];
}

export interface CompanyPreference {
  name: string;
  liked: boolean;
  careerPage?: string;
  openRemoteJobs?: number;
  notes?: string;
}

export interface Profile {
  name: string;
  email: string;
  phone?: string;
  location: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  summary: string;
  education: Education[];
  experience: WorkExperience[];
  projects: Project[];
  skills: { languages: string[]; frameworks: string[]; tools: string[]; concepts: string[] };
  targetRoles: TargetRole[];
  targetLocations: string[];
  salaryMin?: number;
  preferredCompanies: CompanyPreference[];
  appliedJobIds: string[];
}

// ─── Applied job ──────────────────────────────────────────────────────────────

export interface AppliedJob {
  id: string;
  title: string;
  company: string;
  url: string;
  appliedDate: string;
  status: "applied" | "screening" | "interview" | "offer" | "rejected" | "ghosted";
  followUpDate?: string;
  notes?: string;
}

export interface ScoredJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string;
  postedAt: string;
  score: number;
  matchReasons: string[];
  missingSkills: string[];
  recommendation: "apply" | "skip" | "stretch";
}

export interface TailoredCV {
  summary: string;
  highlightedBullets: string[];
  skillsToEmphasise: string[];
}

export interface ApplyUrlResult {
  job: ScoredJob;
  tailoredCV: TailoredCV;
  coverLetter: string;
}
