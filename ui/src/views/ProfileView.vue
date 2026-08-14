<template>
  <div>
    <h1 class="page-title">My Profile / CV</h1>
    <p class="sub">
      Paste your CV text or upload a document. The content is extracted in-browser — the file is
      never stored. The agent parses it into a structured profile which you can review and save.
    </p>

    <!-- ── Input panel (shown when no parsed profile yet) ─────────────────── -->
    <template v-if="!parsed">

      <!-- Mode tabs -->
      <div class="mode-tabs">
        <button :class="['tab', { active: mode === 'paste' }]" @click="mode = 'paste'">Paste text</button>
        <button :class="['tab', { active: mode === 'upload' }]" @click="mode = 'upload'">Upload file</button>
        <button v-if="existing" :class="['tab', { active: mode === 'view' }]" @click="mode = 'view'">View current</button>
      </div>

      <!-- Paste mode -->
      <div v-if="mode === 'paste'" class="card input-card">
        <textarea
          v-model="pasteText"
          class="cv-textarea"
          placeholder="Paste your CV here — plain text or copied from Word/PDF…"
          :disabled="parsing"
        />
        <div class="input-actions">
          <span class="char-count">{{ pasteText.length }} chars</span>
          <button class="primary" :disabled="parsing || pasteText.trim().length < 50" @click="parse(pasteText)">
            {{ parsing ? 'Parsing…' : 'Parse CV ✦' }}
          </button>
        </div>
        <p v-if="parseError" class="error-msg" style="margin-top:10px">{{ parseError }}</p>
      </div>

      <!-- Upload mode -->
      <div v-else-if="mode === 'upload'" class="card input-card">
        <div
          class="drop-zone"
          :class="{ dragging }"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
          @click="fileInput?.click()"
        >
          <input ref="fileInput" type="file" accept=".txt,.pdf,.doc,.docx" style="display:none" @change="onFileChange" />
          <div v-if="!extractedText">
            <div class="drop-icon">📄</div>
            <p>Drop a <strong>.txt</strong>, <strong>.pdf</strong>, or <strong>.docx</strong> file here</p>
            <p class="drop-hint">or click to browse — the file is read locally and never uploaded</p>
          </div>
          <div v-else class="extracted-preview">
            <div class="extracted-header">
              <span class="file-name">{{ fileName }}</span>
              <button class="ghost small" @click.stop="clearFile">✕ Clear</button>
            </div>
            <pre class="preview-text">{{ extractedText.slice(0, 500) }}{{ extractedText.length > 500 ? '\n…' : '' }}</pre>
          </div>
        </div>

        <p v-if="extractError" class="error-msg" style="margin-top:10px">{{ extractError }}</p>

        <div class="input-actions" v-if="extractedText">
          <span class="char-count">{{ extractedText.length }} chars extracted</span>
          <button class="primary" :disabled="parsing" @click="parse(extractedText)">
            {{ parsing ? 'Parsing…' : 'Parse CV ✦' }}
          </button>
        </div>
        <p v-if="parseError" class="error-msg" style="margin-top:10px">{{ parseError }}</p>
      </div>

      <!-- View current profile (read-only summary) -->
      <div v-else-if="mode === 'view' && existing" class="card">
        <ProfileSummary :profile="existing" />
        <div style="margin-top:16px; display:flex; gap:8px;">
          <button class="ghost" @click="startEdit(existing!)">Edit profile</button>
        </div>
      </div>

    </template>

    <!-- ── Parsed result — review + edit before saving ─────────────────────── -->
    <template v-else>
      <div class="parsed-bar">
        <div class="parsed-notice">
          ✓ Profile parsed — review below then save, or
          <button class="link-btn" @click="repaste">re-parse</button>.
        </div>
        <div style="display:flex; gap:8px">
          <button class="ghost" @click="repaste">Cancel</button>
          <button class="primary" :disabled="saving" @click="save">
            {{ saving ? 'Saving…' : 'Save Profile' }}
          </button>
        </div>
      </div>
      <p v-if="saveError" class="error-msg" style="margin-bottom:12px">{{ saveError }}</p>
      <p v-if="saveOk" class="success-msg" style="margin-bottom:12px">✓ Profile saved.</p>

      <ProfileEditor v-model="parsed" />
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api";
import type { Profile } from "../types";
import ProfileSummary from "../components/ProfileSummary.vue";
import ProfileEditor from "../components/ProfileEditor.vue";

const mode = ref<"paste" | "upload" | "view">("paste");
const existing = ref<Profile | null>(null);

const pasteText = ref("");
const parsing = ref(false);
const parseError = ref("");
const parsed = ref<Profile | null>(null);

const dragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const fileName = ref("");
const extractedText = ref("");
const extractError = ref("");

const saving = ref(false);
const saveError = ref("");
const saveOk = ref(false);

onMounted(async () => {
  existing.value = await api.getProfile().catch(() => null);
  if (existing.value) mode.value = "view";
});

// ── File handling (client-side only, file never leaves browser) ───────────────

function onDrop(e: DragEvent) {
  dragging.value = false;
  const file = e.dataTransfer?.files[0];
  if (file) readFile(file);
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) readFile(file);
}

function clearFile() {
  extractedText.value = "";
  fileName.value = "";
  extractError.value = "";
  if (fileInput.value) fileInput.value.value = "";
}

async function readFile(file: File) {
  extractError.value = "";
  fileName.value = file.name;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  try {
    if (ext === "txt") {
      extractedText.value = await file.text();
    } else if (ext === "pdf") {
      extractedText.value = await extractPdf(file);
    } else if (ext === "docx" || ext === "doc") {
      extractedText.value = await extractDocx(file);
    } else {
      extractError.value = "Unsupported file type. Use .txt, .pdf, or .docx.";
    }
  } catch (err) {
    extractError.value = `Could not read file: ${(err as Error).message}`;
  }
}

/** Extract text from a PDF using the PDF.js CDN via a hidden iframe approach —
 *  we use a simpler route: read raw bytes and pull out readable text tokens. */
async function extractPdf(file: File): Promise<string> {
  // Load PDF.js from CDN dynamically — only when actually needed
  if (!("pdfjsLib" in window)) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs", true);
    (window as unknown as Record<string, unknown>)["pdfjsLib"] =
      await (window as unknown as Record<string, { default: unknown }>)["pdfjsLib"];
    // Set worker
    const lib = (window as unknown as Record<string, { GlobalWorkerOptions: { workerSrc: string } }>)["pdfjsLib"];
    lib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
  }

  const lib = (window as unknown as Record<string, {
    GlobalWorkerOptions: { workerSrc: string };
    getDocument: (src: ArrayBuffer) => { promise: Promise<{
      numPages: number;
      getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: { str: string }[] }> }>;
    }> };
  }>)["pdfjsLib"];

  const buffer = await file.arrayBuffer();
  const pdf = await lib.getDocument(buffer).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((item) => item.str).join(" "));
  }
  return parts.join("\n");
}

function loadScript(src: string, isModule = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    if (isModule) s.type = "module";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/** Extract text from a .docx by unzipping and reading word/document.xml */
async function extractDocx(file: File): Promise<string> {
  // Use JSZip from CDN
  if (!("JSZip" in window)) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
  }
  const JSZip = (window as unknown as Record<string, new () => {
    loadAsync: (b: ArrayBuffer) => Promise<{ files: Record<string, { async: (t: string) => Promise<string> }> }>;
  }>)["JSZip"];

  const zip = new JSZip();
  const buffer = await file.arrayBuffer();
  const loaded = await zip.loadAsync(buffer);
  const xmlStr = await loaded.files["word/document.xml"].async("string");

  // Strip XML tags and decode entities
  return xmlStr
    .replace(/<w:br[^/]*/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Parse & save ──────────────────────────────────────────────────────────────

async function parse(text: string) {
  parsing.value = true;
  parseError.value = "";
  try {
    parsed.value = await api.parseProfile(text);
  } catch (err) {
    parseError.value = (err as Error).message;
  } finally {
    parsing.value = false;
  }
}

async function save() {
  if (!parsed.value) return;
  saving.value = true;
  saveError.value = "";
  saveOk.value = false;
  try {
    await api.saveProfile(parsed.value);
    existing.value = parsed.value;
    saveOk.value = true;
    setTimeout(() => {
      saveOk.value = false;
      repaste();
      mode.value = "view";
    }, 1500);
  } catch (err) {
    saveError.value = (err as Error).message;
  } finally {
    saving.value = false;
  }
}

function repaste() {
  parsed.value = null;
  pasteText.value = "";
  clearFile();
  mode.value = existing.value ? "view" : "paste";
}

function startEdit(profile: Profile) {
  parsed.value = JSON.parse(JSON.stringify(profile)) as Profile;
  mode.value = "paste"; // hides the view panel
}
</script>

<style scoped>
.page-title { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
.sub { color: var(--muted); font-size: 13px; margin-bottom: 24px; max-width: 640px; }

/* Tabs */
.mode-tabs { display: flex; gap: 4px; margin-bottom: 16px; }
.tab {
  padding: 6px 16px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--surface); color: var(--muted); font-size: 13px; font-weight: 500; cursor: pointer;
}
.tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }

/* Input card */
.input-card { display: flex; flex-direction: column; gap: 12px; }
.cv-textarea {
  font-family: var(--font); font-size: 13px; line-height: 1.6;
  width: 100%; min-height: 260px; resize: vertical;
  padding: 12px; border: 1px solid var(--border); border-radius: 6px;
  background: var(--bg); color: var(--text); outline: none;
}
.cv-textarea:focus { border-color: var(--accent); }
.input-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.char-count { font-size: 12px; color: var(--muted); }

/* Drop zone */
.drop-zone {
  border: 2px dashed var(--border); border-radius: 8px; padding: 40px 24px;
  text-align: center; cursor: pointer; color: var(--muted); font-size: 13px;
  transition: border-color 0.15s, background 0.15s;
}
.drop-zone:hover, .drop-zone.dragging { border-color: var(--accent); background: #eff6ff; }
.drop-icon { font-size: 32px; margin-bottom: 10px; }
.drop-hint { font-size: 12px; margin-top: 6px; }
.extracted-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.file-name { font-size: 13px; font-weight: 500; color: var(--text); }
.small { font-size: 11px; padding: 3px 8px; }
.preview-text {
  text-align: left; font-size: 11px; line-height: 1.5; color: var(--muted);
  white-space: pre-wrap; max-height: 140px; overflow: hidden; border-radius: 4px;
  background: var(--bg); padding: 8px; border: 1px solid var(--border);
}

/* Parsed bar */
.parsed-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0;
  border-radius: 8px; margin-bottom: 16px; gap: 12px;
}
.parsed-notice { font-size: 13px; color: var(--green); }
.link-btn { background: none; border: none; color: var(--accent); font-size: 13px; cursor: pointer; padding: 0; text-decoration: underline; }

.success-msg { color: var(--green); font-size: 13px; padding: 8px 12px; background: #dcfce7; border-radius: 6px; }
</style>
