import * as XLSX from "xlsx";
import { loadProfile, saveProfile } from "../profile/profile.js";
import type { CompanyPreference } from "../profile/types.js";
import * as fs from "fs";
import * as path from "path";

export interface ParsedCompany {
  name: string;
  careerPage?: string;
  openRemoteJobs?: number;
  notes?: string;
}

/**
 * Parse an uploaded Excel file containing company names.
 * Expected columns: "Company", "URL", "Notes" (case-insensitive)
 */
export function parseCompaniesFromExcel(buffer: Buffer): ParsedCompany[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any>(sheet);

  const companies: ParsedCompany[] = [];

  for (const row of rows) {
    // Find keys case-insensitively
    const keys = Object.keys(row);
    const companyKey = keys.find((k) => k.toLowerCase() === "company");
    const careerKey = keys.find((k) =>
      ["career page", "careerpage", "career_page", "careers", "url"].includes(k.toLowerCase())
    );
    const jobsKey = keys.find((k) =>
      ["open remote jobs", "openremotejobs", "open_remote_jobs", "remote jobs", "jobs"].includes(k.toLowerCase())
    );
    const notesKey = keys.find((k) => k.toLowerCase() === "notes");

    const name = companyKey ? String(row[companyKey]).trim() : "";
    if (!name) continue;

    const rawJobs = jobsKey ? row[jobsKey] : undefined;
    const openRemoteJobs =
      rawJobs !== undefined && rawJobs !== null && rawJobs !== ""
        ? Number(rawJobs)
        : undefined;

    companies.push({
      name,
      careerPage: careerKey ? String(row[careerKey]).trim() || undefined : undefined,
      openRemoteJobs: openRemoteJobs !== undefined && !isNaN(openRemoteJobs) ? openRemoteJobs : undefined,
      notes: notesKey ? String(row[notesKey]).trim() || undefined : undefined,
    });
  }

  return companies;
}

/**
 * Add parsed companies to the user's profile as preferred companies.
 * Marks them as liked=false initially so user can review.
 */
export function addCompaniesToProfile(companies: ParsedCompany[]): { added: number; skipped: number } {
  const profile = loadProfile();
  
  let added = 0;
  let skipped = 0;

  for (const company of companies) {
    const exists = profile.preferredCompanies.some(
      (c) => c.name.toLowerCase() === company.name.toLowerCase()
    );

    if (exists) {
      skipped++;
      continue;
    }

    profile.preferredCompanies.push({
      name: company.name,
      liked: false,
      careerPage: company.careerPage,
      openRemoteJobs: company.openRemoteJobs,
      notes: company.notes,
    });
    added++;
  }

  if (added > 0) {
    saveProfile(profile);
  }

  return { added, skipped };
}

/**
 * Get all preferred companies from the profile with their job listings.
 */
export function getPreferredCompanies(): Array<CompanyPreference & { jobCount: number }> {
  const profile = loadProfile();
  
  // Load applied jobs to count jobs per company
  let appliedJobs: any[] = [];
  try {
    const dataPath = path.join(process.cwd(), "data", "applications.json");
    if (fs.existsSync(dataPath)) {
      appliedJobs = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    }
  } catch {
    // No applications yet
  }

  return profile.preferredCompanies.map((company) => ({
    ...company,
    jobCount: appliedJobs.filter((j) => 
      j.company.toLowerCase() === company.name.toLowerCase()
    ).length,
  }));
}
