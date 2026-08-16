<template>
  <div class="chat-layout">
    <div class="chat-header">
      <h1 class="page-title">Career Advisor</h1>
      <p class="sub">Ask me anything — CV advice, interview prep, role fit, salary negotiation, and more.</p>
    </div>

    <!-- Message thread -->
    <div class="messages" ref="messagesEl">
      <!-- Empty state -->
      <div v-if="messages.length === 0" class="empty-state">
        <div class="avatar ai-avatar">✦</div>
        <p class="empty-title">Your personal career advisor</p>
        <p class="sub">I have access to your CV and can give specific, tailored advice.</p>
        <div class="suggestions">
          <button
            v-for="s in suggestions"
            :key="s"
            class="suggestion-chip"
            @click="sendSuggestion(s)"
          >{{ s }}</button>
        </div>
      </div>

      <!-- Messages -->
      <template v-else>
        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="message-row"
          :class="msg.role"
        >
          <div class="avatar" :class="msg.role === 'assistant' ? 'ai-avatar' : 'user-avatar'">
            {{ msg.role === 'assistant' ? '✦' : 'You' }}
          </div>
          <div class="bubble" :class="msg.role">
            <p v-for="(line, li) in formatMessage(msg.content)" :key="li" :class="{ 'empty-line': line === '' }">{{ line }}</p>
          </div>
        </div>

        <!-- Typing indicator -->
        <div v-if="loading" class="message-row assistant">
          <div class="avatar ai-avatar">✦</div>
          <div class="bubble assistant typing">
            <span></span><span></span><span></span>
          </div>
        </div>
      </template>
    </div>

    <!-- Input bar -->
    <div class="input-bar">
      <p v-if="error" class="error-inline">{{ error }}</p>
      <div class="input-row">
        <textarea
          ref="inputEl"
          v-model="draft"
          class="chat-input"
          placeholder="Ask anything about your career…"
          rows="1"
          :disabled="loading"
          @keydown.enter.exact.prevent="send"
          @input="autoResize"
        />
        <button class="send-btn" :disabled="loading || !draft.trim()" @click="send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <p class="hint">Enter to send · Shift+Enter for new line</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from "vue";
import { api } from "../api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const messages = ref<Message[]>([]);
const draft = ref("");
const loading = ref(false);
const error = ref("");
const messagesEl = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLTextAreaElement | null>(null);

const suggestions = [
  "How do I stand out as a junior developer?",
  "What should I put on my CV for internships?",
  "How do I answer 'tell me about yourself'?",
  "What salary should I ask for as a junior dev in the UK?",
  "How do I get interviews without much experience?",
];

function formatMessage(content: string): string[] {
  return content.split("\n");
}

function autoResize(e: Event) {
  const el = e.target as HTMLTextAreaElement;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 160) + "px";
}

async function scrollToBottom() {
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
}

async function sendSuggestion(text: string) {
  draft.value = text;
  await send();
}

async function send() {
  const text = draft.value.trim();
  if (!text || loading.value) return;

  error.value = "";
  messages.value.push({ role: "user", content: text });
  draft.value = "";

  // Reset textarea height
  await nextTick();
  if (inputEl.value) inputEl.value.style.height = "auto";

  await scrollToBottom();
  loading.value = true;

  try {
    const { reply } = await api.sendChat(messages.value);
    messages.value.push({ role: "assistant", content: reply });
    await scrollToBottom();
  } catch (err) {
    error.value = (err as Error).message;
    // Remove the user message that failed so they can retry
    messages.value.pop();
  } finally {
    loading.value = false;
    await nextTick();
    inputEl.value?.focus();
  }
}
</script>

<style scoped>
.chat-layout {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  max-width: 760px;
}

.chat-header { margin-bottom: 16px; flex-shrink: 0; }
.page-title { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
.sub { color: var(--muted); font-size: 13px; }

/* ── Thread ── */
.messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 4px 2px 16px;
  scroll-behavior: smooth;
}

.empty-state {
  margin: auto;
  text-align: center;
  padding: 32px 0;
}
.empty-title { font-size: 16px; font-weight: 600; margin: 12px 0 4px; }

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 20px;
}
.suggestion-chip {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text);
  transition: background 0.12s, border-color 0.12s;
}
.suggestion-chip:hover { background: #dbeafe; border-color: var(--accent); color: var(--accent); }

.message-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.message-row.user { flex-direction: row-reverse; }

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.ai-avatar { background: #dbeafe; color: var(--accent); }
.user-avatar { background: #f3e8ff; color: #7c3aed; font-size: 10px; }

.bubble {
  max-width: 72%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
}
.bubble p { margin: 0; }
.bubble p.empty-line { height: 0.6em; }
.bubble.assistant {
  background: var(--surface);
  border: 1px solid var(--border);
  border-top-left-radius: 4px;
}
.bubble.user {
  background: var(--accent);
  color: #fff;
  border-top-right-radius: 4px;
}

/* Typing dots */
.bubble.typing {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 14px 16px;
}
.bubble.typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted);
  animation: dot-bounce 1.2s infinite ease-in-out both;
}
.bubble.typing span:nth-child(1) { animation-delay: -0.32s; }
.bubble.typing span:nth-child(2) { animation-delay: -0.16s; }

@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* ── Input bar ── */
.input-bar { flex-shrink: 0; padding-top: 12px; border-top: 1px solid var(--border); }

.error-inline {
  color: var(--red, #dc2626);
  font-size: 12px;
  margin: 0 0 8px;
  padding: 6px 10px;
  background: #fef2f2;
  border-radius: 6px;
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  resize: none;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.5;
  background: var(--bg);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
  overflow-y: hidden;
}
.chat-input:focus { border-color: var(--accent); }
.chat-input:disabled { opacity: 0.5; }

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity 0.15s;
}
.send-btn:disabled { opacity: 0.4; cursor: default; }
.send-btn:not(:disabled):hover { opacity: 0.85; }

.hint { font-size: 11px; color: var(--muted); margin: 6px 0 0; }
</style>
