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
  startDate: string; // "YYYY-MM"
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
  keywords: string[]; // must-have keywords to match
  antiKeywords?: string[]; // reject if any of these appear
}

export interface CompanyPreference {
  name: string;
  liked: boolean;
  notes?: string;
}

export interface AppliedJob {
  id: string;
  title: string;
  company: string;
  url: string;
  appliedDate: string; // ISO date
  status: "applied" | "screening" | "interview" | "offer" | "rejected" | "ghosted";
  followUpDate?: string; // ISO date when to follow up
  notes?: string;
}

export interface Profile {
  // Personal info
  name: string;
  email: string;
  phone?: string;
  location: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;

  // Summary blurb used in cover letters
  summary: string;

  // CV sections
  education: Education[];
  experience: WorkExperience[];
  projects: Project[];
  skills: {
    languages: string[];
    frameworks: string[];
    tools: string[];
    concepts: string[];
  };

  // Job search preferences
  targetRoles: TargetRole[];
  targetLocations: string[]; // e.g. ["Remote", "London", "Berlin"]
  salaryMin?: number; // annual, GBP
  preferredCompanies: CompanyPreference[];

  // Jobs already applied for (job IDs)
  appliedJobIds: string[];
}
