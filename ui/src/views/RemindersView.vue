<template>
  <div>
    <h1 class="page-title">Follow-up Reminders</h1>
    <p class="sub">Applications you applied to 7+ days ago that still need a follow-up.</p>

    <div v-if="loading" class="muted" style="margin-top:20px">Loading…</div>

    <div v-else-if="!reminders.length" class="empty card">
      <span>✓</span> No follow-ups due today — you're all caught up!
    </div>

    <div v-else class="reminder-list">
      <div v-for="job in reminders" :key="job.id" class="reminder-card card">
        <div class="reminder-header">
          <div>
            <a class="job-title" :href="job.url" target="_blank">{{ job.title }}</a>
            <span class="company">@ {{ job.company }}</span>
          </div>
          <span class="badge applied">Follow up!</span>
        </div>

        <div class="reminder-meta">
          <span>Applied {{ job.appliedDate }}</span>
          <span v-if="job.followUpDate"> · Due {{ job.followUpDate }}</span>
        </div>

        <p v-if="job.notes" class="notes">{{ job.notes }}</p>

        <div class="action-row">
          <button class="primary" :disabled="marking[job.id]" @click="markFollowedUp(job)">
            {{ marking[job.id] ? "Saving…" : "✓ Mark as Followed Up" }}
          </button>
          <button class="ghost" :disabled="marking[job.id]" @click="markRejected(job)">
            Mark as Rejected
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { api } from "../api";
import type { AppliedJob } from "../types";

const reminders = ref<AppliedJob[]>([]);
const loading = ref(true);
const marking = reactive<Record<string, boolean>>({});

onMounted(async () => {
  reminders.value = await api.getReminders().catch(() => []);
  loading.value = false;
});

async function markFollowedUp(job: AppliedJob) {
  marking[job.id] = true;
  try {
    await api.updateApplication(job.id, "screening");
    reminders.value = reminders.value.filter((j) => j.id !== job.id);
  } finally {
    marking[job.id] = false;
  }
}

async function markRejected(job: AppliedJob) {
  marking[job.id] = true;
  try {
    await api.updateApplication(job.id, "rejected");
    reminders.value = reminders.value.filter((j) => j.id !== job.id);
  } finally {
    marking[job.id] = false;
  }
}
</script>

<style scoped>
.page-title { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
.sub { color: var(--muted); font-size: 13px; margin-bottom: 24px; }

.empty { color: var(--green); font-size: 14px; display: flex; align-items: center; gap: 8px; }

.reminder-list { display: flex; flex-direction: column; gap: 14px; }
.reminder-card { border-left: 3px solid var(--yellow); }

.reminder-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 6px; }
.job-title { font-weight: 600; font-size: 15px; }
.company { color: var(--muted); font-size: 13px; margin-left: 6px; }
.reminder-meta { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
.notes { font-size: 13px; color: var(--muted); font-style: italic; margin-bottom: 10px; }

.action-row { display: flex; gap: 8px; margin-top: 10px; }
.muted { color: var(--muted); font-size: 13px; }
</style>
