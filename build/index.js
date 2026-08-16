#!/usr/bin/env node
import "dotenv/config";
/**
 * career-agent CLI
 *
 * Usage:
 *   career-agent morning    — run the daily job search + scoring + CV generation
 *   career-agent status     — show tracked application statuses
 *   career-agent reminders  — check follow-up reminders
 *   career-agent report     — send the weekly report email right now
 *   career-agent update <id> <status> [notes]  — update an application's status
 */
import chalk from "chalk";
import { runMorning } from "./agent/morning.js";
import { checkReminders } from "./reminders/reminders.js";
import { loadAppliedJobs, updateStatus } from "./jobs/tracker.js";
import { sendEmail } from "./email/mailer.js";
import { buildWeeklyReport } from "./email/templates.js";
const [, , command, ...args] = process.argv;
async function main() {
    switch (command) {
        case "morning":
            await runMorning();
            break;
        case "status":
            printStatus();
            break;
        case "reminders":
            checkReminders();
            break;
        case "report": {
            const today = new Date().toISOString().slice(0, 10);
            const weekStart = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            await sendEmail({
                subject: `📊 Career Agent — Weekly Report (${weekStart} → ${today})`,
                html: buildWeeklyReport(loadAppliedJobs(), weekStart, today),
            });
            console.log(chalk.green("✓ Weekly report sent"));
            break;
        }
        case "update": {
            const [id, status, ...noteParts] = args;
            if (!id || !status) {
                console.error(chalk.red("Usage: career-agent update <id> <status> [notes]"));
                process.exit(1);
            }
            const validStatuses = [
                "applied", "screening", "interview", "offer", "rejected", "ghosted",
            ];
            if (!validStatuses.includes(status)) {
                console.error(chalk.red(`Invalid status. Choose from: ${validStatuses.join(", ")}`));
                process.exit(1);
            }
            updateStatus(id, status, noteParts.join(" ") || undefined);
            console.log(chalk.green(`✓ Updated ${id} → ${status}`));
            break;
        }
        default:
            printHelp();
    }
}
function printStatus() {
    const jobs = loadAppliedJobs();
    if (jobs.length === 0) {
        console.log(chalk.yellow("No applications tracked yet. Run `career-agent morning` to start."));
        return;
    }
    const statusEmoji = {
        applied: "📤",
        screening: "🔍",
        interview: "🎤",
        offer: "🎉",
        rejected: "❌",
        ghosted: "👻",
    };
    // Group by status
    const grouped = new Map();
    for (const job of jobs) {
        const list = grouped.get(job.status) ?? [];
        list.push(job);
        grouped.set(job.status, list);
    }
    console.log(chalk.bold.cyan(`\n📋  Application Tracker (${jobs.length} total)\n`));
    const order = [
        "offer", "interview", "screening", "applied", "ghosted", "rejected",
    ];
    for (const status of order) {
        const list = grouped.get(status);
        if (!list)
            continue;
        console.log(chalk.bold(`${statusEmoji[status]}  ${status.toUpperCase()} (${list.length})`));
        for (const job of list) {
            console.log(`   ${chalk.white(job.title)} ${chalk.dim(`@ ${job.company}`)} — applied ${job.appliedDate}`);
            if (job.followUpDate) {
                const today = new Date().toISOString().slice(0, 10);
                const overdue = job.followUpDate <= today && status === "applied";
                const followLabel = overdue
                    ? chalk.red(`follow up OVERDUE (${job.followUpDate})`)
                    : chalk.dim(`follow up ${job.followUpDate}`);
                console.log(`   ${followLabel}`);
            }
            console.log(chalk.dim(`   ID: ${job.id}  →  ${job.url}`));
        }
        console.log();
    }
}
function printHelp() {
    console.log(`
${chalk.bold.cyan("career-agent")} — personal career manager

${chalk.bold("Commands:")}
  ${chalk.green("morning")}              Run the daily job hunt (search → score → draft CV & cover letter)
  ${chalk.green("status")}               Show all tracked applications grouped by status
  ${chalk.green("reminders")}            Check for overdue follow-ups
  ${chalk.green("report")}               Send the weekly report email immediately
  ${chalk.green("update")} <id> <status> [notes]
                        Update an application's status
                        Statuses: applied | screening | interview | offer | rejected | ghosted

${chalk.bold("Examples:")}
  career-agent morning
  career-agent update adzuna-123 interview "Call booked for Friday"
  career-agent status
`);
}
main().catch((err) => {
    console.error(chalk.red("\n❌ Fatal error:"), err);
    process.exit(1);
});
