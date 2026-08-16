<template>
  <div class="layout">
    <nav class="sidebar">
      <div class="brand">🎯 Career Agent</div>
      <router-link to="/">Dashboard</router-link>
      <router-link to="/apply-url">✦ Apply from URL</router-link>
      <router-link to="/applications">Applications</router-link>
      <router-link to="/reminders">Reminders</router-link>
      <div class="nav-divider"></div>
      <router-link to="/companies">Target Companies</router-link>
      <router-link to="/profile">My Profile</router-link>
    </nav>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 200px;
  min-height: 100vh;
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.brand {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 20px;
  padding-left: 8px;
}

.sidebar a {
  display: block;
  padding: 8px 12px;
  border-radius: 6px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.12s, color 0.12s;
}
.sidebar a:hover { background: var(--bg); color: var(--text); }
.nav-divider { height: 1px; background: var(--border); margin: 8px 0; }
.sidebar a.router-link-active { background: #dbeafe; color: var(--accent); }

.content {
  flex: 1;
  padding: 32px;
  max-width: 900px;
}
</style>
