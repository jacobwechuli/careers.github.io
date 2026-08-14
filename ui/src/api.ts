import type { AppliedJob, ApplyUrlResult, Profile } from "./types";

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
};
