<template>
  <div class="summary">
    <div class="personal-header">
      <div>
        <h2>{{ profile.name }}</h2>
        <div class="personal-meta">
          <span v-if="profile.email">{{ profile.email }}</span>
          <span v-if="profile.location"> · {{ profile.location }}</span>
          <span v-if="profile.phone"> · {{ profile.phone }}</span>
        </div>
        <div class="links-row">
          <a v-if="profile.linkedin" :href="profile.linkedin" target="_blank">LinkedIn</a>
          <a v-if="profile.github" :href="profile.github" target="_blank">GitHub</a>
          <a v-if="profile.portfolio" :href="profile.portfolio" target="_blank">Portfolio</a>
        </div>
      </div>
    </div>

    <p class="summary-text">{{ profile.summary }}</p>

    <div class="section">
      <div class="section-label">Skills</div>
      <div class="skill-groups">
        <div v-if="profile.skills.languages.length">
          <span class="skill-group-label">Languages</span>
          <div class="tag-row"><span v-for="s in profile.skills.languages" :key="s" class="tag">{{ s }}</span></div>
        </div>
        <div v-if="profile.skills.frameworks.length">
          <span class="skill-group-label">Frameworks</span>
          <div class="tag-row"><span v-for="s in profile.skills.frameworks" :key="s" class="tag">{{ s }}</span></div>
        </div>
        <div v-if="profile.skills.tools.length">
          <span class="skill-group-label">Tools</span>
          <div class="tag-row"><span v-for="s in profile.skills.tools" :key="s" class="tag">{{ s }}</span></div>
        </div>
        <div v-if="profile.skills.concepts.length">
          <span class="skill-group-label">Concepts</span>
          <div class="tag-row"><span v-for="s in profile.skills.concepts" :key="s" class="tag blue">{{ s }}</span></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-label">Experience</div>
      <div v-for="exp in profile.experience" :key="exp.company + exp.role" class="exp-item">
        <div class="exp-header">
          <span class="exp-role">{{ exp.role }}</span>
          <span class="exp-company"> @ {{ exp.company }}</span>
          <span class="exp-dates">{{ exp.startDate }} – {{ exp.endDate }}</span>
        </div>
        <ul class="bullet-list">
          <li v-for="b in exp.bullets" :key="b">{{ b }}</li>
        </ul>
      </div>
    </div>

    <div class="section" v-if="profile.education.length">
      <div class="section-label">Education</div>
      <div v-for="edu in profile.education" :key="edu.institution" class="edu-item">
        <span class="edu-degree">{{ edu.degree }} in {{ edu.field }}</span>
        <span class="edu-inst"> — {{ edu.institution }}</span>
        <span class="edu-dates"> ({{ edu.startYear }}–{{ edu.endYear }})</span>
        <span v-if="edu.grade" class="edu-grade"> · {{ edu.grade }}</span>
      </div>
    </div>

    <div class="section" v-if="profile.targetRoles.length">
      <div class="section-label">Target Roles</div>
      <div v-for="role in profile.targetRoles" :key="role.title" class="role-item">
        <span class="role-title">{{ role.title }}</span>
        <span class="role-kws"> · {{ role.keywords.slice(0, 5).join(', ') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Profile } from "../types";
defineProps<{ profile: Profile }>();
</script>

<style scoped>
.summary { display: flex; flex-direction: column; gap: 20px; }
.personal-header h2 { font-size: 18px; font-weight: 700; }
.personal-meta { font-size: 13px; color: var(--muted); margin-top: 2px; }
.links-row { display: flex; gap: 12px; margin-top: 4px; font-size: 12px; }
.summary-text { font-size: 13px; line-height: 1.7; color: var(--text); }
.section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 8px; }
.skill-groups { display: flex; flex-direction: column; gap: 8px; }
.skill-group-label { font-size: 11px; color: var(--muted); margin-right: 6px; }
.tag-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
.tag { background: #eff6ff; color: var(--accent); font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; }
.tag.blue { background: #f5f3ff; color: #6d28d9; }
.exp-item { margin-bottom: 12px; }
.exp-header { font-size: 13px; margin-bottom: 4px; }
.exp-role { font-weight: 600; }
.exp-company { color: var(--muted); }
.exp-dates { font-size: 12px; color: var(--muted); float: right; }
.bullet-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.bullet-list li { font-size: 12px; color: var(--muted); padding-left: 14px; position: relative; }
.bullet-list li::before { content: "•"; position: absolute; left: 0; }
.edu-item { font-size: 13px; margin-bottom: 4px; }
.edu-degree { font-weight: 500; }
.edu-inst, .edu-dates, .edu-grade { color: var(--muted); }
.role-item { font-size: 13px; margin-bottom: 4px; }
.role-title { font-weight: 500; }
.role-kws { font-size: 12px; color: var(--muted); }
</style>
