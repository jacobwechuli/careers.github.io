/**
 * Morning run — the main orchestration loop.
 *
 * Steps:
 *   1. Load user profile
 *   2. Fetch fresh jobs from all boards
 *   3. Score each job against the profile
 *   4. For each "apply" / "stretch" job above the threshold:
 *      a. Tailor the CV
 *      b. Draft a cover letter
 *      c. Save output files to data/output/<date>/<company>/
 *   5. Print a summary + send daily email digest
 *   6. On Fridays, also send a weekly report email
 *   7. Check follow-up reminders
 */
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ora from "ora";
import { loadProfile, saveProfile } from "../profile/profile.js";
import { fetchJobs } from "../jobs/search.js";
import { scoreJobs } from "../jobs/scorer.js";
import { recordApplication, loadAppliedJobs, getDueFollowUps } from "../jobs/tracker.js";
import { tailorCV } from "../cv/tailor.js";
import { generateCoverLetter } from "../cv/coverLetter.js";
import { checkReminders } from "../reminders/reminders.js";
import { sendEmail } from "../email/mailer.js";
import { buildDailyDigest, buildWeeklyReport } from "../email/templates.js";
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");
const SCORE_THRESHOLD = 55; // only produce materials for jobs scored above this
export async function runMorning() {
    console.log(chalk.bold.cyan("\n🌅  Career Agent — Morning Run\n"));
    // 1. Load profile
    const spinner = ora("Loading profile…").start();
    const profile = loadProfile();
    spinner.succeed(`Loaded profile for ${chalk.bold(profile.name)}`);
    // 2. Fetch jobs
    spinner.start("Fetching jobs from Adzuna + Remotive…");
    const rawJobs = await fetchJobs(profile);
    spinner.succeed(`Found ${chalk.bold(rawJobs.length)} new jobs after pre-filtering`);
    if (rawJobs.length === 0) {
        console.log(chalk.yellow("No new jobs found today. Try again tomorrow!"));
        checkReminders();
        return;
    }
    // 3. Score jobs
    spinner.start(`Scoring ${rawJobs.length} jobs…`);
    const scored = await scoreJobs(rawJobs, profile);
    spinner.succeed("Scoring complete");
    // 4. Print results table
    printScoreSummary(scored);
    // 5. Generate materials for top jobs
    const today = new Date().toISOString().slice(0, 10);
    const actionable = scored.filter((j) => j.score >= SCORE_THRESHOLD && j.recommendation !== "skip");
    if (actionable.length === 0) {
        console.log(chalk.yellow("\nNo jobs scored above threshold today."));
    }
    else {
        console.log(chalk.green(`\n✍️  Generating materials for ${actionable.length} job(s)…\n`));
        for (const job of actionable) {
            const slug = slugify(`${job.company}-${job.title}`);
            const outDir = join(DATA_DIR, "output", today, slug);
            mkdirSync(outDir, { recursive: true });
            spinner.start(`${job.company} — ${job.title}`);
            // Tailor CV
            const tailored = await tailorCV(profile, job);
            writeFileSync(join(outDir, "cv-tailored.json"), JSON.stringify(tailored, null, 2));
            // Cover letter
            const letter = await generateCoverLetter(profile, job);
            writeFileSync(join(outDir, "cover-letter.txt"), letter);
            // Job details snapshot
            writeFileSync(join(outDir, "job.json"), JSON.stringify(job, null, 2));
            // Track application (status: applied, follow up in 7 days)
            const followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 10);
            recordApplication({
                id: job.id,
                title: job.title,
                company: job.company,
                url: job.url,
                appliedDate: today,
                status: "applied",
                followUpDate,
            });
            // Add to profile's appliedJobIds to avoid future duplication
            if (!profile.appliedJobIds.includes(job.id)) {
                profile.appliedJobIds.push(job.id);
            }
            spinner.succeed(`${chalk.bold(job.company)} — ${job.title} ` +
                chalk.dim(`[score: ${job.score}]`) +
                chalk.green(` → ${outDir}`));
        }
        // Persist updated appliedJobIds
        saveProfile(profile);
    }
    // 6. Reminders
    console.log();
    checkReminders();
    // 7. Send emails
    const overdueFollowUps = getDueFollowUps();
    spinner.start("Sending daily digest email…");
    await sendEmail({
        subject: `🌅 Career Agent — ${actionable.length} job(s) found (${today})`,
        html: buildDailyDigest(scored, overdueFollowUps, today),
    });
    spinner.succeed("Daily digest sent");
    // Friday = day 5
    if (new Date().getDay() === 5) {
        const weekStart = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        spinner.start("Sending weekly report email…");
        await sendEmail({
            subject: `📊 Career Agent — Weekly Report (${weekStart} → ${today})`,
            html: buildWeeklyReport(loadAppliedJobs(), weekStart, today),
        });
        spinner.succeed("Weekly report sent");
    }
    console.log(chalk.bold.cyan("\n✅  Morning run complete.\n"));
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
function printScoreSummary(jobs) {
    console.log(chalk.bold("\n📊  Job Scores:\n"));
    for (const job of jobs.slice(0, 20)) {
        const bar = scoreBar(job.score);
        const rec = recommendationLabel(job.recommendation);
        console.log(`  ${bar} ${chalk.bold(job.score.toString().padStart(3))}  ${rec}  ` +
            chalk.white(job.title) +
            chalk.dim(` @ ${job.company}`));
        for (const reason of job.matchReasons) {
            console.log(chalk.dim(`         • ${reason}`));
        }
        if (job.missingSkills.length > 0) {
            console.log(chalk.dim(`         ⚠ Missing: ${job.missingSkills.join(", ")}`));
        }
        console.log();
    }
}
function scoreBar(score) {
    const filled = Math.round(score / 10);
    const bar = "█".repeat(filled) + "░".repeat(10 - filled);
    if (score >= 70)
        return chalk.green(bar);
    if (score >= 50)
        return chalk.yellow(bar);
    return chalk.red(bar);
}
function recommendationLabel(rec) {
    if (rec === "apply")
        return chalk.green("[APPLY  ]");
    if (rec === "stretch")
        return chalk.yellow("[STRETCH]");
    return chalk.red("[SKIP   ]");
}
function slugify(s) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);
}
