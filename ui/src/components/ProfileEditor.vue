<template>
  <div class="editor">

    <!-- Personal info -->
    <div class="card section-card">
      <div class="section-heading">Personal Info</div>
      <div class="field-grid">
        <label>Name <input v-model="p.name" /></label>
        <label>Email <input v-model="p.email" type="email" /></label>
        <label>Phone <input v-model="p.phone" /></label>
        <label>Location <input v-model="p.location" /></label>
        <label>LinkedIn <input v-model="p.linkedin" /></label>
        <label>GitHub <input v-model="p.github" /></label>
        <label>Portfolio <input v-model="p.portfolio" /></label>
        <label>Salary Min (£)
          <input v-model.number="p.salaryMin" type="number" min="0" step="1000" />
        </label>
      </div>
      <label class="full-label">Summary
        <textarea v-model="p.summary" class="summary-ta" />
      </label>
    </div>

    <!-- Skills -->
    <div class="card section-card">
      <div class="section-heading">Skills</div>
      <div class="field-grid">
        <label>Languages (comma-separated)
          <input :value="p.skills.languages.join(', ')" @change="setSkill('languages', $event)" />
        </label>
        <label>Frameworks
          <input :value="p.skills.frameworks.join(', ')" @change="setSkill('frameworks', $event)" />
        </label>
        <label>Tools
          <input :value="p.skills.tools.join(', ')" @change="setSkill('tools', $event)" />
        </label>
        <label>Concepts
          <input :value="p.skills.concepts.join(', ')" @change="setSkill('concepts', $event)" />
        </label>
      </div>
    </div>

    <!-- Target roles -->
    <div class="card section-card">
      <div class="section-heading">
        Target Roles
        <button class="ghost small" @click="addRole">+ Add</button>
      </div>
      <div v-for="(role, i) in p.targetRoles" :key="i" class="list-item">
        <div class="list-item-fields">
          <label>Title <input v-model="role.title" /></label>
          <label>Keywords (comma-separated)
            <input :value="role.keywords.join(', ')" @change="setArr(role, 'keywords', $event)" />
          </label>
          <label>Anti-keywords
            <input :value="(role.antiKeywords ?? []).join(', ')" @change="setArr(role, 'antiKeywords', $event)" />
          </label>
        </div>
        <button class="remove-btn" @click="p.targetRoles.splice(i, 1)">✕</button>
      </div>
      <label class="full-label" style="margin-top:10px">
        Target Locations (comma-separated)
        <input :value="p.targetLocations.join(', ')" @change="setLocations($event)" />
      </label>
    </div>

    <!-- Experience -->
    <div class="card section-card">
      <div class="section-heading">
        Experience
        <button class="ghost small" @click="addExp">+ Add</button>
      </div>
      <div v-for="(exp, i) in p.experience" :key="i" class="list-item exp-item">
        <div class="list-item-fields">
          <div class="field-grid">
            <label>Role <input v-model="exp.role" /></label>
            <label>Company <input v-model="exp.company" /></label>
            <label>Start (YYYY-MM) <input v-model="exp.startDate" /></label>
            <label>End (YYYY-MM or 'present') <input v-model="exp.endDate" /></label>
          </div>
          <label class="full-label">Bullets (one per line)
            <textarea
              class="bullets-ta"
              :value="exp.bullets.join('\n')"
              @change="setBullets(exp, $event)"
            />
          </label>
          <label class="full-label">Skills used (comma-separated)
            <input :value="exp.skills.join(', ')" @change="setArr(exp, 'skills', $event)" />
          </label>
        </div>
        <button class="remove-btn" @click="p.experience.splice(i, 1)">✕</button>
      </div>
    </div>

    <!-- Education -->
    <div class="card section-card">
      <div class="section-heading">
        Education
        <button class="ghost small" @click="addEdu">+ Add</button>
      </div>
      <div v-for="(edu, i) in p.education" :key="i" class="list-item">
        <div class="list-item-fields">
          <div class="field-grid">
            <label>Institution <input v-model="edu.institution" /></label>
            <label>Degree <input v-model="edu.degree" /></label>
            <label>Field <input v-model="edu.field" /></label>
            <label>Grade <input v-model="edu.grade" /></label>
            <label>Start Year <input v-model.number="edu.startYear" type="number" /></label>
            <label>End Year (or 'present') <input v-model="edu.endYear" /></label>
          </div>
        </div>
        <button class="remove-btn" @click="p.education.splice(i, 1)">✕</button>
      </div>
    </div>

    <!-- Projects -->
    <div class="card section-card">
      <div class="section-heading">
        Projects
        <button class="ghost small" @click="addProject">+ Add</button>
      </div>
      <div v-for="(proj, i) in p.projects" :key="i" class="list-item">
        <div class="list-item-fields">
          <div class="field-grid">
            <label>Name <input v-model="proj.name" /></label>
            <label>URL <input v-model="proj.url" /></label>
            <label class="field-span2">Description <input v-model="proj.description" /></label>
            <label class="field-span2">Tech (comma-separated)
              <input :value="proj.tech.join(', ')" @change="setArr(proj, 'tech', $event)" />
            </label>
          </div>
          <label class="full-label">Highlights (one per line)
            <textarea
              class="bullets-ta"
              :value="proj.highlights.join('\n')"
              @change="setProjHighlights(proj, $event)"
            />
          </label>
        </div>
        <button class="remove-btn" @click="p.projects.splice(i, 1)">✕</button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Profile, WorkExperience, Project, TargetRole } from "../types";

const props = defineProps<{ modelValue: Profile }>();
const emit = defineEmits<{ (e: "update:modelValue", val: Profile): void }>();

// Work directly on a reactive proxy — mutations bubble up via v-model
const p = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function splitCsv(e: Event): string[] {
  return (e.target as HTMLInputElement).value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function setSkill(key: keyof Profile["skills"], e: Event) {
  p.value.skills[key] = splitCsv(e);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setArr(obj: any, key: string, e: Event) {
  obj[key] = splitCsv(e);
}

function setLocations(e: Event) {
  p.value.targetLocations = splitCsv(e);
}

function setBullets(exp: WorkExperience, e: Event) {
  exp.bullets = (e.target as HTMLTextAreaElement).value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function setProjHighlights(proj: Project, e: Event) {
  proj.highlights = (e.target as HTMLTextAreaElement).value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── Add blank items ───────────────────────────────────────────────────────────

function addExp() {
  p.value.experience.push({ company: "", role: "", startDate: "", endDate: "present", bullets: [], skills: [] });
}
function addEdu() {
  p.value.education.push({ institution: "", degree: "", field: "", startYear: new Date().getFullYear(), endYear: "present" });
}
function addProject() {
  p.value.projects.push({ name: "", description: "", tech: [], highlights: [] });
}
function addRole() {
  p.value.targetRoles.push({ title: "", keywords: [], antiKeywords: [] });
}
</script>

<style scoped>
.editor { display: flex; flex-direction: column; gap: 16px; }

.section-card { }
.section-heading {
  font-size: 13px; font-weight: 600; color: var(--text);
  margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 8px; border-bottom: 1px solid var(--border);
}

.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
.field-span2 { grid-column: span 2; }

label {
  display: flex; flex-direction: column; gap: 4px;
  font-size: 12px; font-weight: 500; color: var(--muted);
}

input, textarea, select {
  font-family: var(--font); font-size: 13px; color: var(--text);
  padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px;
  background: var(--bg); outline: none; width: 100%;
}
input:focus, textarea:focus { border-color: var(--accent); }

.full-label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 500; color: var(--muted); }
.summary-ta { min-height: 80px; resize: vertical; }
.bullets-ta { min-height: 80px; resize: vertical; font-size: 12px; }

.list-item {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 14px 0; border-top: 1px solid var(--border);
}
.list-item-fields { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.remove-btn {
  background: none; border: none; color: var(--muted); cursor: pointer;
  font-size: 14px; padding: 4px; margin-top: 2px; flex-shrink: 0;
}
.remove-btn:hover { color: var(--red); }

.exp-item { }
.small { font-size: 11px; padding: 3px 8px; }
</style>
