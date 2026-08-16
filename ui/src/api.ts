import type { AppliedJob, ApplyUrlResult, Profile, CompanyPreference } from "./types";

export interface RankedCompany {
  name: string;
  score: number;
  reason: string;
  roleTypes: string[];
  careerPage?: string;
  openRemoteJobs?: number;
  liked: boolean;
}

export interface ParsedCompany {
  name: string;
  url?: string;
  notes?: string;
}

export interface CompanyWithJobs extends CompanyPreference {
  jobCount: number;
  careerPage?: string;
  openRemoteJobs?: number;
}

export interface UploadResult {
  ok: boolean;
  added: number;
  skipped: number;
  companies: ParsedCompany[];
}

const BASE = `${import.meta.env.VITE_API_URL ?? ""}/api`;

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getApplications: () =>
    fetch(`${BASE}/applications`).then((r) => json<AppliedJob[]>(r)),

  updateApplication: (id: string, status: AppliedJob["status"], notes?: string) =>
    fetch(`${BASE}/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    }).then((r) => json<{ ok: boolean }>(r)),

  getReminders: () =>
    fetch(`${BASE}/reminders`).then((r) => json<AppliedJob[]>(r)),

  runStatus: () =>
    fetch(`${BASE}/run/status`).then((r) => json<{ running: boolean }>(r)),

  startRun: () =>
    fetch(`${BASE}/run`, { method: "POST" }).then((r) => json<{ ok: boolean }>(r)),

  getProfile: () =>
    fetch(`${BASE}/profile`).then((r) => json<Profile | null>(r)),

  saveProfile: (profile: Profile) =>
    fetch(`${BASE}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    }).then((r) => json<{ ok: boolean }>(r)),

  parseProfile: (text: string) =>
    fetch(`${BASE}/profile/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).then((r) => json<Profile>(r)),

  applyUrl: (url: string) =>
    fetch(`${BASE}/apply-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).then((r) => json<ApplyUrlResult>(r)),

  uploadCompanies: (file: File) =>
    fetch(`${BASE}/companies/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: file,
    }).then((r) => json<UploadResult>(r)),

  getCompanies: () =>
    fetch(`${BASE}/companies`).then((r) => json<CompanyWithJobs[]>(r)),

  updateCompany: (name: string, liked?: boolean, notes?: string) =>
    fetch(`${BASE}/companies/${encodeURIComponent(name)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liked, notes }),
    }).then((r) => json<{ ok: boolean }>(r)),

  deleteCompany: (name: string) =>
    fetch(`${BASE}/companies/${encodeURIComponent(name)}`, {
      method: "DELETE",
    }).then((r) => json<{ ok: boolean }>(r)),

  rankCompanies: () =>
    fetch(`${BASE}/companies/rank`, { method: "POST" }).then((r) => json<RankedCompany[]>(r)),
};
