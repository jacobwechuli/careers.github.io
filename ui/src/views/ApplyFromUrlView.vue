<template>
  <div>
    <h1 class="page-title">Apply from URL</h1>
    <p class="sub">
      Paste any job posting link. The agent will scrape the page, score it against your profile,
      then tailor your CV and write a cover letter — all in one go.
    </p>

    <!-- Input -->
    <div class="card input-card">
      <input
        v-model="url"
        class="url-input"
        type="url"
        placeholder="https://jobs.example.com/software-engineer-123"
        :disabled="loading"
        @keydown.enter="submit"
      />
      <button class="primary" :disabled="loading || !url.startsWith('http')" @click="submit">
        {{ loading ? "Working…" : "Generate ✦" }}
      </button>
    </div>

    <!-- Progress steps -->
    <div v-if="loading || steps.some(s => s.done)" class="steps-row">
      <div v-for="step in steps" :key="step.label" :class="['step', { done: step.done, active: step.active }]">
        <span class="step-dot">{{ step.done ? "✓" : step.active ? "●" : "○" }}</span>
        {{ step.label }}
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-msg" style="margin-top:16px">{{ error }}</div>

    <!-- Results -->
    <template v-if="result">
      <!-- Job match card -->
      <div class="card result-section">
        <div class="result-header">
          <div>
            <a class="job-title" :href="result.job.url" target="_blank">{{ result.job.title }}</a>
            <span class="company">@ {{ result.job.company }}</span>
          </div>
          <div class="score-badge" :class="scoreClass">{{ result.job.score }}<span>/100</span></div>
        </div>

        <div class="job-meta">
          <span>{{ result.job.location }}</span>
          <span v-if="result.job.salary"> · {{ result.job.salary }}</span>
          <span :class="['badge', result.job.recommendation]" style="margin-left:8px">
            {{ result.job.recommendation }}
          </span>
        </div>

        <div class="two-col" style="margin-top:12px">
          <div>
            <div class="section-label">Match reasons</div>
            <ul class="pill-list">
              <li v-for="r in result.job.matchReasons" :key="r">{{ r }}</li>
            </ul>
          </div>
          <div v-if="result.job.missingSkills.length">
            <div class="section-label">Gaps</div>
            <ul class="pill-list gaps">
              <li v-for="s in result.job.missingSkills" :key="s">{{ s }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Tailored CV -->
      <div class="card result-section">
        <div class="result-title">
          Tailored CV
          <button class="ghost copy-btn" @click="copy(cvText, 'cv')">
            {{ copied === 'cv' ? '✓ Copied' : 'Copy' }}
          </button>
        </div>

        <div class="section-label" style="margin-top:12px">Summary</div>
        <p class="body-text">{{ result.tailoredCV.summary }}</p>

        <div class="section-label" style="margin-top:14px">Skills to Emphasise</div>
        <div class="tag-row">
          <span v-for="s in result.tailoredCV.skillsToEmphasise" :key="s" class="tag">{{ s }}</span>
        </div>

        <div class="section-label" style="margin-top:14px">Top Experience Bullets</div>
        <ul class="bullet-list">
          <li v-for="b in result.tailoredCV.highlightedBullets" :key="b">{{ b }}</li>
        </ul>
      </div>

      <!-- Cover letter -->
      <div class="card result-section">
        <div class="result-title">
          Cover Letter
          <button class="ghost copy-btn" @click="copy(result!.coverLetter, 'letter')">
            {{ copied === 'letter' ? '✓ Copied' : 'Copy' }}
          </button>
        </div>
        <p class="cover-letter">{{ result.coverLetter }}</p>
      </div>

      <!-- Reset -->
      <button class="ghost" style="margin-top:8px" @click="reset">← Apply for another job</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from "vue";
import { api } from "../api";
import type { ApplyUrlResult } from "../types";

const url = ref("");
const loading = ref(false);
const error = ref("");
const result = ref<ApplyUrlResult | null>(null);
const copied = ref("");

interface Step { label: string; done: boolean; active: boolean }
const steps = reactive<Step[]>([
  { label: "Fetching page", done: false, active: false },
  { label: "Scoring match", done: false, active: false },
  { label: "Tailoring CV", done: false, active: false },
  { label: "Writing cover letter", done: false, active: false },
]);

function activateStep(i: number) {
  steps.forEach((s, idx) => {
    s.active = idx === i;
    if (idx < i) s.done = true;
  });
}

function completeAll() {
  steps.forEach((s) => { s.done = true; s.active = false; });
}

function resetSteps() {
  steps.forEach((s) => { s.done = false; s.active = false; });
}

const scoreClass = computed(() => {
  if (!result.value) return "";
  const s = result.value.job.score;
  return s >= 70 ? "score-green" : s >= 50 ? "score-yellow" : "score-red";
});

const cvText = computed(() => {
  if (!result.value) return "";
  const cv = result.value.tailoredCV;
  return [
    "SUMMARY",
    cv.summary,
    "",
    "SKILLS TO EMPHASISE",
    cv.skillsToEmphasise.join(", "),
    "",
    "TOP EXPERIENCE BULLETS",
    ...cv.highlightedBullets.map((b) => `• ${b}`),
  ].join("\n");
});

async function submit() {
  if (!url.value.startsWith("http")) return;
  loading.value = true;
  error.value = "";
  result.value = null;
  resetSteps();

  // Simulate step progression while waiting (API is a single call)
  activateStep(0);
  const stepInterval = setInterval(() => {
    const current = steps.findIndex((s) => s.active);
    if (current < steps.length - 1) activateStep(current + 1);
  }, 3500);

  try {
    const res = await api.applyUrl(url.value);
    clearInterval(stepInterval);
    completeAll();
    result.value = res;
  } catch (err) {
    clearInterval(stepInterval);
    resetSteps();
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function copy(text: string, key: string) {
  await navigator.clipboard.writeText(text);
  copied.value = key;
  setTimeout(() => { copied.value = ""; }, 2000);
}

function reset() {
  result.value = null;
  url.value = "";
  resetSteps();
  error.value = "";
}
</script>

<style scoped>
.page-title { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
.sub { color: var(--muted); font-size: 13px; margin-bottom: 24px; }

.input-card { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; }
.url-input {
  flex: 1;
  font-family: var(--font);
  font-size: 13px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  background: var(--bg);
  outline: none;
}
.url-input:focus { border-color: var(--accent); }

/* Steps */
.steps-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; }
.step {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
  padding: 4px 10px;
  border-radius: 99px;
  border: 1px solid var(--border);
  background: var(--surface);
}
.step.active { color: var(--accent); border-color: var(--accent); background: #eff6ff; }
.step.done   { color: var(--green);  border-color: #bbf7d0;        background: #f0fdf4; }
.step-dot { font-size: 11px; }

/* Result sections */
.result-section { margin-bottom: 20px; }
.result-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 6px; }
.job-title { font-weight: 600; font-size: 16px; }
.company { color: var(--muted); font-size: 13px; margin-left: 6px; }
.job-meta { font-size: 12px; color: var(--muted); }
.result-title { font-size: 15px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
.copy-btn { font-size: 12px; padding: 4px 10px; }

/* Score badge */
.score-badge { font-size: 24px; font-weight: 700; line-height: 1; }
.score-badge span { font-size: 13px; font-weight: 400; color: var(--muted); }
.score-green { color: var(--green); }
.score-yellow { color: var(--yellow); }
.score-red { color: var(--red); }

.section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 6px; }

.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.pill-list { list-style: none; display: flex; flex-direction: column; gap: 4px; }
.pill-list li { font-size: 13px; padding-left: 14px; position: relative; }
.pill-list li::before { content: "•"; position: absolute; left: 0; color: var(--green); }
.pill-list.gaps li::before { color: var(--yellow); }

.tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { background: #eff6ff; color: var(--accent); font-size: 12px; font-weight: 500; padding: 3px 9px; border-radius: 99px; }

.bullet-list { list-style: none; display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.bullet-list li { font-size: 13px; padding-left: 16px; position: relative; line-height: 1.5; }
.bullet-list li::before { content: "→"; position: absolute; left: 0; color: var(--muted); }

.body-text { font-size: 13px; line-height: 1.6; color: var(--text); }
.cover-letter { font-size: 13px; line-height: 1.8; white-space: pre-line; color: var(--text); margin-top: 12px; }
</style>
