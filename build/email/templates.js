// ─── Shared styles ────────────────────────────────────────────────────────────
const BASE_STYLE = `
  body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, "Segoe UI", sans-serif; }
  .wrap { max-width: 620px; margin: 24px auto; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
  .header { background: #0f172a; color: #fff; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
  .header p  { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
  .body { padding: 24px 32px; }
  h2 { font-size: 15px; font-weight: 700; color: #0f172a; margin: 24px 0 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  .job-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px; margin-bottom: 12px; }
  .job-title { font-size: 15px; font-weight: 700; color: #0f172a; text-decoration: none; }
  .job-meta  { font-size: 12px; color: #64748b; margin: 2px 0 8px; }
  .score-pill { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 700; }
  .score-high   { background: #dcfce7; color: #166534; }
  .score-mid    { background: #fef9c3; color: #854d0e; }
  .score-low    { background: #fee2e2; color: #991b1b; }
  .rec-apply    { background: #dbeafe; color: #1e40af; }
  .rec-stretch  { background: #fde68a; color: #92400e; }
  ul.reasons { margin: 6px 0 0 0; padding-left: 18px; font-size: 13px; color: #374151; }
  ul.reasons li { margin-bottom: 2px; }
  .missing { font-size: 12px; color: #dc2626; margin-top: 4px; }
  .reminder-card { border-left: 3px solid #f97316; background: #fff7ed; border-radius: 4px; padding: 10px 14px; margin-bottom: 8px; font-size: 13px; }
  .reminder-card a { color: #0f172a; font-weight: 600; }
  .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
  .stat-box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; text-align: center; }
  .stat-box .num { font-size: 28px; font-weight: 800; color: #0f172a; }
  .stat-box .lbl { font-size: 11px; color: #64748b; margin-top: 2px; }
  .status-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
  .status-badge { padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
  .badge-applied    { background: #dbeafe; color: #1e40af; }
  .badge-screening  { background: #e0e7ff; color: #3730a3; }
  .badge-interview  { background: #d1fae5; color: #065f46; }
  .badge-offer      { background: #bbf7d0; color: #14532d; }
  .badge-rejected   { background: #fee2e2; color: #991b1b; }
  .badge-ghosted    { background: #f3f4f6; color: #6b7280; }
  .footer { background: #f8fafc; border-top: 1px solid #e5e7eb; padding: 16px 32px; font-size: 11px; color: #94a3b8; text-align: center; }
`;
function html(body, title) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${BASE_STYLE}</style></head><body>${body}</body></html>`;
}
// ─── Daily Digest ─────────────────────────────────────────────────────────────
export function buildDailyDigest(scored, overdueFollowUps, date) {
    const actionable = scored.filter((j) => j.recommendation !== "skip");
    const skipped = scored.length - actionable.length;
    // ── Job cards ──
    const jobCards = actionable.length === 0
        ? `<p style="color:#64748b;font-size:13px;">No actionable jobs found today.</p>`
        : actionable
            .map((j) => {
            const scoreClass = j.score >= 70 ? "score-high" : j.score >= 50 ? "score-mid" : "score-low";
            const recClass = j.recommendation === "apply" ? "rec-apply" : "rec-stretch";
            const recLabel = j.recommendation === "apply" ? "APPLY" : "STRETCH";
            const reasons = j.matchReasons
                .map((r) => `<li>${escHtml(r)}</li>`)
                .join("");
            const missing = j.missingSkills.length > 0
                ? `<p class="missing">⚠ Missing: ${escHtml(j.missingSkills.join(", "))}</p>`
                : "";
            return `
          <div class="job-card">
            <a class="job-title" href="${j.url}">${escHtml(j.title)}</a>
            <p class="job-meta">${escHtml(j.company)} · ${escHtml(j.location)}${j.salary ? ` · ${escHtml(j.salary)}` : ""}</p>
            <span class="score-pill ${scoreClass}">${j.score}/100</span>
            &nbsp;
            <span class="score-pill ${recClass}">${recLabel}</span>
            <ul class="reasons">${reasons}</ul>
            ${missing}
          </div>`;
        })
            .join("");
    // ── Reminders ──
    const remindersHtml = overdueFollowUps.length === 0
        ? `<p style="color:#64748b;font-size:13px;">No overdue follow-ups.</p>`
        : overdueFollowUps
            .map((j) => `
        <div class="reminder-card">
          <a href="${j.url}">${escHtml(j.title)} @ ${escHtml(j.company)}</a>
          — applied ${j.appliedDate}, follow-up due ${j.followUpDate ?? ""}
        </div>`)
            .join("");
    const body = `
  <div class="wrap">
    <div class="header">
      <h1>🌅 Career Agent — Daily Digest</h1>
      <p>${date} · ${scored.length} jobs scored · ${actionable.length} actionable · ${skipped} skipped</p>
    </div>
    <div class="body">
      <h2>Today's Jobs</h2>
      ${jobCards}
      <h2>Follow-up Reminders</h2>
      ${remindersHtml}
    </div>
    <div class="footer">Career Agent · <a href="https://github.com">View on GitHub</a></div>
  </div>`;
    return html(body, `Career Agent — ${date}`);
}
// ─── Weekly Report ────────────────────────────────────────────────────────────
export function buildWeeklyReport(allApplied, weekStart, weekEnd) {
    // Jobs applied this week
    const thisWeek = allApplied.filter((j) => j.appliedDate >= weekStart && j.appliedDate <= weekEnd);
    // Total pipeline stats across all time
    const counts = {
        applied: 0, screening: 0, interview: 0, offer: 0, rejected: 0, ghosted: 0,
    };
    for (const j of allApplied)
        counts[j.status]++;
    const responseRate = allApplied.length > 0
        ? Math.round(((counts.screening + counts.interview + counts.offer + counts.rejected) /
            allApplied.length) *
            100)
        : 0;
    // ── Stat boxes ──
    const stats = `
  <div class="stat-grid">
    <div class="stat-box"><div class="num">${thisWeek.length}</div><div class="lbl">Applied this week</div></div>
    <div class="stat-box"><div class="num">${allApplied.length}</div><div class="lbl">Total applications</div></div>
    <div class="stat-box"><div class="num">${responseRate}%</div><div class="lbl">Response rate</div></div>
  </div>`;
    // ── Pipeline breakdown ──
    const statusLabels = [
        { key: "offer", label: "🎉 Offer" },
        { key: "interview", label: "🎤 Interview" },
        { key: "screening", label: "🔍 Screening" },
        { key: "applied", label: "📤 Applied" },
        { key: "ghosted", label: "👻 Ghosted" },
        { key: "rejected", label: "❌ Rejected" },
    ];
    const pipelineRows = statusLabels
        .map(({ key, label }) => counts[key] === 0
        ? ""
        : `<div class="status-row">
            <span>${label}</span>
            <span class="status-badge badge-${key}">${counts[key]}</span>
          </div>`)
        .join("");
    // ── This week's applications ──
    const weekRows = thisWeek.length === 0
        ? `<p style="color:#64748b;font-size:13px;">No new applications this week.</p>`
        : thisWeek
            .map((j) => `
        <div class="status-row">
          <span><a href="${j.url}" style="color:#0f172a;font-weight:600;">${escHtml(j.title)}</a>
          <span style="color:#64748b"> @ ${escHtml(j.company)}</span></span>
          <span class="status-badge badge-${j.status}">${j.status}</span>
        </div>`)
            .join("");
    const body = `
  <div class="wrap">
    <div class="header">
      <h1>📊 Career Agent — Weekly Report</h1>
      <p>Week of ${weekStart} → ${weekEnd}</p>
    </div>
    <div class="body">
      <h2>Pipeline Overview</h2>
      ${stats}
      ${pipelineRows}
      <h2>Applied This Week</h2>
      ${weekRows}
    </div>
    <div class="footer">Career Agent · Have a great weekend 🎉</div>
  </div>`;
    return html(body, `Career Agent — Weekly Report ${weekEnd}`);
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
