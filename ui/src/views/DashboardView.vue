<template>
  <div>
    <h1 class="page-title">Dashboard</h1>

    <!-- Morning run card -->
    <div class="card run-card">
      <div class="run-header">
        <div>
          <h2>Morning Run</h2>
          <p class="sub">Fetch new jobs, score them with AI, and draft your CV &amp; cover letters.</p>
        </div>
        <button
          class="primary"
          :disabled="running"
          @click="startRun"
        >
          {{ running ? "Running…" : "▶ Run Now" }}
        </button>
      </div>
      <p v-if="runError" class="error-msg" style="margin-top:12px">{{ runError }}</p>
      <p v-if="runDone" class="success-msg">✓ Morning run complete! Check your email for results.</p>
    </div>

    <!-- Stats row -->
    <div class="stats-row">
      <div class="stat-card card" v-for="stat in stats" :key="stat.label">
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
      </div>
    </div>

    <!-- Recent applications -->
    <div class="card" style="margin-top:24px">
      <h2 style="margin-bottom:14px">Recent Applications</h2>
      <div v-if="loading" class="muted">Loading…</div>
      <div v-else-if="!recent.length" class="muted">No applications yet. Run the morning job first!</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Company</th>
            <th>Applied</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="job in recent" :key="job.id">
            <td><a :href="job.url" target="_blank">{{ job.title }}</a></td>
            <td>{{ job.company }}</td>
            <td>{{ job.appliedDate }}</td>
            <td><span :class="['badge', job.status]">{{ job.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { api } from "../api";
import type { AppliedJob } from "../types";

const applications = ref<AppliedJob[]>([]);
const loading = ref(true);
const running = ref(false);
const runError = ref("");
const runDone = ref(false);

onMounted(async () => {
  applications.value = await api.getApplications().catch(() => []);
  loading.value = false;
  const status = await api.runStatus().catch(() => ({ running: false }));
  running.value = status.running;
});

const recent = computed(() =>
  [...applications.value]
    .sort((a, b) => b.appliedDate.localeCompare(a.appliedDate))
    .slice(0, 5)
);

const stats = computed(() => {
  const jobs = applications.value;
  return [
    { label: "Total Applied", value: jobs.length },
    { label: "Interviews", value: jobs.filter((j) => j.status === "interview").length },
    { label: "Offers", value: jobs.filter((j) => j.status === "offer").length },
    { label: "Follow-ups Due", value: jobs.filter((j) => {
        const today = new Date().toISOString().slice(0, 10);
        return j.status === "applied" && j.followUpDate && j.followUpDate <= today;
      }).length,
    },
  ];
});

async function startRun() {
  running.value = true;
  runError.value = "";
  runDone.value = false;
  try {
    await api.startRun();
    runDone.value = true;
    applications.value = await api.getApplications().catch(() => []);
  } catch (err) {
    runError.value = (err as Error).message;
  } finally {
    running.value = false;
  }
}
</script>

<style scoped>
.page-title { font-size: 22px; font-weight: 700; margin-bottom: 24px; }

.run-card { margin-bottom: 24px; }
.run-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.run-header h2 { font-size: 16px; font-weight: 600; }
.sub { color: var(--muted); font-size: 13px; margin-top: 4px; }

.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-card { text-align: center; }
.stat-value { font-size: 32px; font-weight: 700; color: var(--accent); }
.stat-label { font-size: 13px; color: var(--muted); margin-top: 4px; }

.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { text-align: left; padding: 8px 12px; color: var(--muted); font-weight: 500; border-bottom: 1px solid var(--border); }
.table td { padding: 10px 12px; border-bottom: 1px solid var(--border); }
.table tbody tr:last-child td { border-bottom: none; }

.muted { color: var(--muted); font-size: 13px; }
.success-msg { color: var(--green); font-size: 13px; padding: 8px 12px; background: #dcfce7; border-radius: 6px; }
</style>
