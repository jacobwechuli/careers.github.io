<template>
  <div>
    <h1 class="page-title">Target Companies</h1>

    <!-- Upload section -->
    <div class="card" style="margin-bottom: 24px">
      <h2 style="margin-bottom: 12px">Upload Company List</h2>
      <p class="sub" style="margin-bottom: 16px">
        Upload an Excel file (.xlsx, .xls) with columns: Company, URL (optional), Notes (optional)
      </p>
      
      <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop">
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx,.xls"
          @change="handleFileSelect"
          style="display: none"
        />
        <div v-if="!selectedFile" class="upload-placeholder" @click="triggerFileInput">
          <span class="upload-icon">📁</span>
          <p><strong>Click to upload</strong> or drag and drop</p>
          <p class="muted">Excel files only (.xlsx, .xls)</p>
        </div>
        <div v-else class="upload-preview">
          <span class="file-icon">📄</span>
          <span class="file-name">{{ selectedFile.name }}</span>
          <button class="secondary small" @click.stop="confirmUpload" :disabled="uploading">
            {{ uploading ? "Processing..." : "✓ Process" }}
          </button>
          <button class="danger small" @click.stop="clearFile">×</button>
        </div>
      </div>

      <div v-if="uploadResult" class="upload-result">
        <p v-if="uploadResult.added > 0" class="success-msg">
          ✓ Added {{ uploadResult.added }} company{{ uploadResult.added !== 1 ? 'ies' : 'y' }}
        </p>
        <p v-if="uploadResult.skipped > 0" class="muted">
          Skipped {{ uploadResult.skipped }} duplicate{{ uploadResult.skipped !== 1 ? 's' : '' }}
        </p>
      </div>

      <div v-if="uploadError" class="error-msg" style="margin-top: 12px">
        {{ uploadError }}
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
            <span v-if="company.jobCount > 0" class="job-count badge">
              {{ company.jobCount }} job{{ company.jobCount !== 1 ? 's' : '' }}
            </span>
            <a
              v-if="company.notes?.includes('URL: http')"
              :href="extractUrl(company.notes)"
              target="_blank"
              class="link-btn"
            >
              🔗 Visit
            </a>
            <button class="danger small" @click="deleteCompany(company)">Delete</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { api } from "../api";
import type { CompanyWithJobs, UploadResult } from "../api";

const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const uploading = ref(false);
const uploadResult = ref<UploadResult | null>(null);
const uploadError = ref("");
const loading = ref(true);
const companies = ref<CompanyWithJobs[]>([]);

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
    // Liked companies first
    if (a.liked !== b.liked) return a.liked ? -1 : 1;
    // Then by job count
    if (b.jobCount !== a.jobCount) return b.jobCount - a.jobCount;
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
});

function handleDrop(event: DragEvent) {
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.name.match(/\.(xlsx|xls)$/)) {
      selectedFile.value = file;
      uploadError.value = "";
    } else {
      uploadError.value = "Please upload an Excel file (.xlsx or .xls)";
    }
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (files && files.length > 0) {
    selectedFile.value = files[0];
    uploadError.value = "";
  }
}

function clearFile() {
  selectedFile.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
}

async function confirmUpload() {
  if (!selectedFile.value) return;

  uploading.value = true;
  uploadError.value = "";
  uploadResult.value = null;

  try {
    const result = await api.uploadCompanies(selectedFile.value);
    uploadResult.value = result;
    selectedFile.value = null;
    if (fileInputRef.value) {
      fileInputRef.value.value = "";
    }
    await loadCompanies();
  } catch (err) {
    uploadError.value = (err as Error).message;
  } finally {
    uploading.value = false;
  }
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

function extractUrl(notes: string): string {
  const match = notes.match(/URL:\s*(https?:\/\/\S+)/);
  return match ? match[1] : "#";
}
</script>

<style scoped>
.page-title { font-size: 22px; font-weight: 700; margin-bottom: 24px; }

.sub { color: var(--muted); font-size: 13px; }

.upload-area {
  border: 2px dashed var(--border);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
}

.upload-area:hover {
  border-color: var(--accent);
}

.upload-placeholder {
  color: var(--muted);
}

.upload-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.upload-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  font-size: 24px;
}

.file-name {
  flex: 1;
  font-weight: 500;
}

.upload-result {
  margin-top: 16px;
  padding: 12px;
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

.companies-header h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.companies-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.company-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  transition: all 0.2s;
}

.company-item.liked {
  background: #fff1f2;
  border-color: #fecdd3;
}

.company-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.like-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: transform 0.2s;
}

.like-btn:hover {
  transform: scale(1.2);
}

.company-info {
  flex: 1;
}

.company-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.company-notes {
  font-size: 12px;
}

.company-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.job-count {
  background: var(--accent);
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.link-btn {
  color: var(--accent);
  text-decoration: none;
  font-size: 13px;
}

.link-btn:hover {
  text-decoration: underline;
}

.small {
  padding: 4px 10px;
  font-size: 12px;
}

.error-msg {
  color: var(--red);
  font-size: 13px;
  padding: 8px 12px;
  background: #fef2f2;
  border-radius: 6px;
}

.muted {
  color: var(--muted);
}
</style>
