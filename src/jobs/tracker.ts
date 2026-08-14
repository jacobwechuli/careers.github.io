/**
 * Application tracker — persists applied jobs to data/applied-jobs.json.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { AppliedJob } from "../profile/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");
const TRACKER_PATH = join(DATA_DIR, "applied-jobs.json");

export function loadAppliedJobs(): AppliedJob[] {
  if (!existsSync(TRACKER_PATH)) return [];
  return JSON.parse(readFileSync(TRACKER_PATH, "utf-8")) as AppliedJob[];
}

export function saveAppliedJobs(jobs: AppliedJob[]): void {
  writeFileSync(TRACKER_PATH, JSON.stringify(jobs, null, 2));
}

export function recordApplication(job: AppliedJob): void {
  const jobs = loadAppliedJobs();
  // Overwrite if already tracked (e.g. status update)
  const idx = jobs.findIndex((j) => j.id === job.id);
  if (idx >= 0) {
    jobs[idx] = job;
  } else {
    jobs.push(job);
  }
  saveAppliedJobs(jobs);
}

export function updateStatus(
  id: string,
  status: AppliedJob["status"],
  notes?: string
): void {
  const jobs = loadAppliedJobs();
  const job = jobs.find((j) => j.id === id);
  if (!job) throw new Error(`Job ${id} not found in tracker`);
  job.status = status;
  if (notes) job.notes = notes;
  saveAppliedJobs(jobs);
}

/** Returns jobs whose followUpDate is today or in the past and status is still "applied". */
export function getDueFollowUps(): AppliedJob[] {
  const today = new Date().toISOString().slice(0, 10);
  return loadAppliedJobs().filter(
    (j) =>
      j.status === "applied" &&
      j.followUpDate !== undefined &&
      j.followUpDate <= today
  );
}
