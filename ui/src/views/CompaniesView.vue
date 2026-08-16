<template>
  <div>
    <h1 class="page-title">Target Companies</h1>

    <!-- Upload section -->
    <div class="card" style="margin-bottom: 24px">
      <h2 style="margin-bottom: 12px">Upload Company List</h2>
      <p class="sub" style="margin-bottom: 16px">
        Upload an Excel file (.xlsx, .xls) with columns: Company, URL (optional), Notes (optional)
      </p>

      <!-- Step 1: file picker -->
      <div v-if="step === 'pick'">
        <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop">
          <input
            ref="fileInputRef"
            type="file"
            accept=".xlsx,.xls"
            @change="handleFileSelect"
            style="display: none"
          />
          <div class="upload-placeholder" @click="triggerFileInput">
            <span class="upload-icon">📁</span>
            <p><strong>Click to upload</strong> or drag and drop</p>
            <p class="muted">Excel files only (.xlsx, .xls)</p>
          </div>
        </div>
        <p v-if="uploadError" class="error-msg" style="margin-top: 12px">{{ uploadError }}</p>
      </div>

      <!-- Step 2: preview parsed rows -->
      <div v-else-if="step === 'preview'">
        <div class="preview-header">
          <span class="muted">{{ parsedRows.length }} companies found in <strong>{{ selectedFile?.name }}</strong></span>
          <div style="display:flex;gap:8px">
            <button class="secondary small" @click="resetUpload">✕ Cancel</button>
            <button class="primary small" :disabled="uploading" @click="confirmUpload">
              {{ uploading ? "Saving…" : `✓ Save ${parsedRows.length} companies` }}
            </button>
          </div>
        </div>
        <table class="table" style="margin-top:12px">
          <thead>
            <tr>
              <th>Company</th>
              <th>URL</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in parsedRows" :key="row.name">
              <td>{{ row.name }}</td>
              <td><a v-if="row.careerPage" :href="row.careerPage" target="_blank" class="link-btn">{{ row.careerPage }}</a></td>
              <td class="muted">{{ row.notes }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="uploadError" class="error-msg" style="margin-top: 12px">{{ uploadError }}</p>
      </div>

      <!-- Step 3: done -->
      <div v-else-if="step === 'done'" class="upload-result">
        <p class="success-msg">✓ Added {{ uploadResult?.added }} compan{{ uploadResult?.added !== 1 ? 'ies' : 'y' }}</p>
        <p v-if="uploadResult?.skipped" class="muted">Skipped {{ uploadResult.skipped }} duplicate{{ uploadResult.skipped !== 1 ? 's' : '' }}</p>
        <button class="secondary small" style="margin-top:10px" @click="resetUpload">Upload another</button>
      </div>
    </div>

    <!-- Companies list -->
    <div class="card">
      <div class="companies-header">
        <h2>Your Target Companies</h2>
        <span class="badge">{{ companies.length }} total</span>
      </div>

      <div v-if="loading" class="muted">Loading...</div>
      <div v-else-if="!companies.length" class="muted">
        No companies yet. Upload an Excel file to get started!
      </div>
      <div v-else class="companies-list">
        <div
          v-for="company in sortedCompanies"
          :key="company.name"
          class="company-item"
          :class="{ liked: company.liked }"
        >
          <div class="company-main">
            <button
              class="like-btn"
              :class="{ active: company.liked }"
              @click="toggleLike(company)"
              title="Mark as liked"
            >
              {{ company.liked ? "❤️" : "🤍" }}
            </button>
            <div class="company-info">
              <div class="company-name">{{ company.name }}</div>
              <div v-if="company.notes" class="company-notes muted">{{ company.notes }}</div>
            </div>
          </div>
          <div class="company-actions">
            <span v-if="company.openRemoteJobs !== undefined" class="jobs-badge" title="Open remote jobs">
              {{ company.openRemoteJobs }} remote
            </span>
            <span v-if="company.jobCount > 0" class="job-count badge">
              {{ company.jobCount }} applied
            </span>
            <a
              v-if="company.careerPage"
              :href="company.careerPage"
              target="_blank"
              class="link-btn"
            >
              🔗 Careers
            </a>
            <button class="danger small" @click="deleteCompany(company)">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Company Ranking -->
    <div class="card" style="margin-top:24px">
      <div class="rank-header">
        <div>
          <h2>AI Company Ranking</h2>
          <p class="sub" style="margin-top:4px">Analyse your company list against your CV to find the best matches.</p>
        </div>
        <button class="primary" :disabled="ranking || companies.length === 0" @click="rankAll">
          {{ ranking ? "Analysing…" : "✦ Rank Companies" }}
        </button>
      </div>

      <p v-if="companies.length === 0 && !ranking" class="muted" style="margin-top:12px">
        Upload your company list first, then rank them.
      </p>
      <p v-if="rankError" class="error-msg" style="margin-top:12px">{{ rankError }}</p>

      <div v-if="rankedCompanies.length > 0" style="margin-top:16px">
        <div
          v-for="(company, idx) in rankedCompanies"
          :key="company.name"
          class="rank-item"
          :class="{ 'rank-top': company.score >= 70 }"
        >
          <div class="rank-position">{{ idx + 1 }}</div>
          <div class="rank-body">
            <div class="rank-name-row">
              <span class="rank-name">{{ company.name }}</span>
              <span v-if="company.liked" title="Liked" style="font-size:14px">❤️</span>
              <span v-if="company.openRemoteJobs !== undefined" class="jobs-badge">{{ company.openRemoteJobs }} remote</span>
              <a v-if="company.careerPage" :href="company.careerPage" target="_blank" class="link-btn">🔗 Careers</a>
            </div>
            <p class="rank-reason muted">{{ company.reason }}</p>
            <div class="rank-roles">
              <span v-for="role in company.roleTypes" :key="role" class="role-tag">{{ role }}</span>
            </div>
          </div>
          <div class="rank-score-col">
            <div class="rank-score" :class="scoreClass(company.score)">{{ company.score }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import * as XLSX from "xlsx";
import { api } from "../api";
import type { CompanyWithJobs, UploadResult, RankedCompany } from "../api";

interface ParsedRow {
  name: string;
  careerPage?: string;
  openRemoteJobs?: number;
  notes?: string;
}

type Step = "pick" | "preview" | "done";

const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const step = ref<Step>("pick");
const parsedRows = ref<ParsedRow[]>([]);
const uploading = ref(false);
const uploadResult = ref<UploadResult | null>(null);
const uploadError = ref("");
const loading = ref(true);
const companies = ref<CompanyWithJobs[]>([]);
const ranking = ref(false);
const rankError = ref("");
const rankedCompanies = ref<RankedCompany[]>([]);

onMounted(async () => {
  await loadCompanies();
});

async function loadCompanies() {
  loading.value = true;
  try {
    companies.value = await api.getCompanies();
  } catch (err) {
    console.error("Failed to load companies:", err);
  } finally {
    loading.value = false;
  }
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

const sortedCompanies = computed(() => {
  return [...companies.value].sort((a, b) => {
    if (a.liked !== b.liked) return a.liked ? -1 : 1;
    if (b.jobCount !== a.jobCount) return b.jobCount - a.jobCount;
    return a.name.localeCompare(b.name);
  });
});

function handleDrop(event: DragEvent) {
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.name.match(/\.(xlsx|xls)$/i)) {
      parseFile(file);
    } else {
      uploadError.value = "Please upload an Excel file (.xlsx or .xls)";
    }
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) parseFile(file);
}

/** Read the Excel file in the browser and show a preview — no server call yet. */
function parseFile(file: File) {
  uploadError.value = "";
  selectedFile.value = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      const parsed: ParsedRow[] = [];
      for (const row of rows) {
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

        parsed.push({
          name,
          careerPage: careerKey ? String(row[careerKey]).trim() || undefined : undefined,
          openRemoteJobs: openRemoteJobs !== undefined && !isNaN(openRemoteJobs) ? openRemoteJobs : undefined,
          notes: notesKey ? String(row[notesKey]).trim() || undefined : undefined,
        });
      }

      if (parsed.length === 0) {
        uploadError.value = "No companies found. Make sure the file has a 'Company' column.";
        return;
      }

      parsedRows.value = parsed;
      step.value = "preview";
    } catch {
      uploadError.value = "Could not read the file. Make sure it is a valid Excel file.";
    }
  };
  reader.onerror = () => {
    uploadError.value = "Failed to read the file.";
  };
  reader.readAsArrayBuffer(file);
}

/** Send the raw file to the server to persist into profile.json. */
async function confirmUpload() {
  if (!selectedFile.value) return;

  uploading.value = true;
  uploadError.value = "";

  try {
    const result = await api.uploadCompanies(selectedFile.value);
    uploadResult.value = result;
    step.value = "done";
    await loadCompanies();
  } catch (err) {
    uploadError.value = (err as Error).message;
  } finally {
    uploading.value = false;
  }
}

async function rankAll() {
  ranking.value = true;
  rankError.value = "";
  try {
    rankedCompanies.value = await api.rankCompanies();
  } catch (err) {
    rankError.value = (err as Error).message;
  } finally {
    ranking.value = false;
  }
}

function scoreClass(score: number) {
  if (score >= 70) return "score-high";
  if (score >= 45) return "score-mid";
  return "score-low";
}

function resetUpload() {
  step.value = "pick";
  selectedFile.value = null;
  parsedRows.value = [];
  uploadError.value = "";
  uploadResult.value = null;
  if (fileInputRef.value) fileInputRef.value.value = "";
}

async function toggleLike(company: CompanyWithJobs) {
  try {
    await api.updateCompany(company.name, !company.liked);
    company.liked = !company.liked;
  } catch (err) {
    console.error("Failed to update company:", err);
  }
}

async function deleteCompany(company: CompanyWithJobs) {
  if (!confirm(`Remove "${company.name}" from your target companies?`)) return;

  try {
    await api.deleteCompany(company.name);
    companies.value = companies.value.filter((c) => c.name !== company.name);
  } catch (err) {
    console.error("Failed to delete company:", err);
  }
}

</script>

<style scoped>
.page-title { font-size: 22px; font-weight: 700; margin-bottom: 24px; }

.sub { color: var(--muted); font-size: 13px; }

.upload-area {
  border: 2px dashed var(--border);
  border-radius: 8px;
  padding: 32px 24px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
}

.upload-area:hover { border-color: var(--accent); }

.upload-placeholder { color: var(--muted); }

.upload-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--surface);
  border-radius: 6px;
  gap: 12px;
}

.upload-result {
  padding: 14px;
  background: #f0fdf4;
  border-radius: 6px;
}

.success-msg {
  color: var(--green);
  font-weight: 500;
  margin: 0;
}

.companies-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.companies-header h2 { font-size: 16px; font-weight: 600; margin: 0; }

.companies-list { display: flex; flex-direction: column; gap: 8px; }

.company-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  transition: all 0.2s;
}

.company-item.liked { background: #fff1f2; border-color: #fecdd3; }

.company-main { display: flex; align-items: center; gap: 12px; flex: 1; }

.like-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: transform 0.2s;
}

.like-btn:hover { transform: scale(1.2); }

.company-info { flex: 1; }
.company-name { font-weight: 500; margin-bottom: 4px; }
.company-notes { font-size: 12px; }

.company-actions { display: flex; align-items: center; gap: 8px; }

.jobs-badge {
  background: #dcfce7;
  color: #16a34a;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}

.job-count {
  background: var(--accent);
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.link-btn { color: var(--accent); text-decoration: none; font-size: 13px; }
.link-btn:hover { text-decoration: underline; }

.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { text-align: left; padding: 8px 12px; color: var(--muted); font-weight: 500; border-bottom: 1px solid var(--border); }
.table td { padding: 8px 12px; border-bottom: 1px solid var(--border); max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.small { padding: 4px 10px; font-size: 12px; }

.error-msg {
  color: var(--red);
  font-size: 13px;
  padding: 8px 12px;
  background: #fef2f2;
  border-radius: 6px;
}

.muted { color: var(--muted); }

/* ── AI ranking ── */
.rank-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.rank-header h2 { font-size: 16px; font-weight: 600; margin: 0; }

.rank-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 10px;
  border-bottom: 1px solid var(--border);
}
.rank-item:last-child { border-bottom: none; }
.rank-item.rank-top { background: #f0fdf4; border-radius: 6px; margin-bottom: 2px; }

.rank-position {
  min-width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  flex-shrink: 0;
  margin-top: 2px;
}

.rank-body { flex: 1; min-width: 0; }

.rank-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}
.rank-name { font-weight: 600; font-size: 14px; }

.rank-reason { font-size: 13px; margin: 0 0 6px; }

.rank-roles { display: flex; flex-wrap: wrap; gap: 6px; }
.role-tag {
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.rank-score-col { flex-shrink: 0; display: flex; align-items: center; }
.rank-score {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
}
.score-high { background: #dcfce7; color: #15803d; }
.score-mid  { background: #fef9c3; color: #854d0e; }
.score-low  { background: #fee2e2; color: #b91c1c; }
</style>
