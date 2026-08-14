<template>
  <div>
    <h1 class="page-title">Applications</h1>

    <div class="filters card">
      <label>
        Filter by status:
        <select v-model="filterStatus">
          <option value="">All</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
    </div>

    <div v-if="loading" class="muted" style="margin-top:20px">Loading…</div>
    <div v-else-if="!filtered.length" class="muted" style="margin-top:20px">No applications match this filter.</div>

    <div v-else class="job-list">
      <div v-for="job in filtered" :key="job.id" class="job-card card">
        <div class="job-header">
          <div>
            <a class="job-title" :href="job.url" target="_blank">{{ job.title }}</a>
            <span class="company">@ {{ job.company }}</span>
          </div>
          <span :class="['badge', job.status]">{{ job.status }}</span>
        </div>

        <div class="job-meta">
          <span>Applied {{ job.appliedDate }}</span>
          <span v-if="job.followUpDate">· Follow up {{ job.followUpDate }}</span>
        </div>

        <p v-if="job.notes" class="notes">{{ job.notes }}</p>

        <!-- Inline status update -->
        <div class="update-row">
          <select v-model="editStatus[job.id]">
            <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
          </select>
          <button
            class="ghost"
            :disabled="saving[job.id]"
            @click="save(job)"
          >
            {{ saving[job.id] ? "Saving…" : "Update" }}
          </button>
          <span v-if="saved[job.id]" class="saved-msg">✓ Saved</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from "vue";
import { api } from "../api";
import type { AppliedJob } from "../types";

const statuses: AppliedJob["status"][] = [
  "applied", "screening", "interview", "offer", "rejected", "ghosted",
];

const applications = ref<AppliedJob[]>([]);
const loading = ref(true);
const filterStatus = ref<AppliedJob["status"] | "">("");
const editStatus = reactive<Record<string, AppliedJob["status"]>>({});
const saving = reactive<Record<string, boolean>>({});
const saved = reactive<Record<string, boolean>>({});

onMounted(async () => {
  await refresh();
  loading.value = false;
});

async function refresh() {
  applications.value = await api.getApplications().catch(() => []);
  for (const job of applications.value) {
    editStatus[job.id] = job.status;
  }
}

const filtered = computed(() =>
  applications.value.filter(
    (j) => !filterStatus.value || j.status === filterStatus.value
  )
);

async function save(job: AppliedJob) {
  saving[job.id] = true;
  saved[job.id] = false;
  try {
    await api.updateApplication(job.id, editStatus[job.id]);
    job.status = editStatus[job.id];
    saved[job.id] = true;
    setTimeout(() => { saved[job.id] = false; }, 2000);
  } finally {
    saving[job.id] = false;
  }
}
</script>

<style scoped>
.page-title { font-size: 22px; font-weight: 700; margin-bottom: 24px; }

.filters { margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
.filters label { font-size: 13px; color: var(--muted); display: flex; align-items: center; gap: 8px; }
select { font-family: var(--font); font-size: 13px; padding: 5px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); }

.job-list { display: flex; flex-direction: column; gap: 14px; }

.job-card { }
.job-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 6px; }
.job-title { font-weight: 600; font-size: 15px; }
.company { color: var(--muted); font-size: 13px; margin-left: 6px; }
.job-meta { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
.notes { font-size: 13px; color: var(--muted); margin-bottom: 10px; font-style: italic; }

.update-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.saved-msg { font-size: 12px; color: var(--green); }
.muted { color: var(--muted); font-size: 13px; }
</style>
