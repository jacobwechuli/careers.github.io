#!/usr/bin/env node
import "dotenv/config";
/**
 * career-agent CLI
 *
 * Usage:
 *   career-agent search    — search job boards for matching junior/internship roles
 *   career-agent status    — show tracked application statuses
 *   career-agent reminders — check follow-up reminders
 *   career-agent update <id> <status> [notes]  — update an application's status
 */
import chalk from "chalk";
import { fetchJobs } from "./jobs/search.js";
import { loadProfile } from "./profile/profile.js";
import { checkReminders } from "./reminders/reminders.js";
import { loadAppliedJobs, updateStatus } from "./jobs/tracker.js";
import type { AppliedJob } from "./profile/types.js";

const [, , command, ...args] = process.argv;

async function main(): Promise<void> {
  switch (command) {
    case "search": {
      const profile = loadProfile();
      console.log(chalk.bold.cyan("\n🔍  Career Agent — Job Search\n"));
      const jobs = await fetchJobs(profile);
      if (jobs.length === 0) {
        console.log(chalk.yellow("No matching junior / internship roles found right now."));
      } else {
        console.log(chalk.green(`Found ${jobs.length} jobs:\n`));
        for (const job of jobs) {
          console.log(
            `  ${chalk.bold(job.title)} ${chalk.dim(`@ ${job.company}`)} — ${job.location}`
          );
          console.log(chalk.dim(`  ${job.url}\n`));
        }
      }
      break;
    }

    case "status":
      printStatus();
      break;

    case "reminders":
      checkReminders();
      break;

    case "update": {
      const [id, status, ...noteParts] = args;
      if (!id || !status) {
        console.error(chalk.red("Usage: career-agent update <id> <status> [notes]"));
        process.exit(1);
      }
      const validStatuses: AppliedJob["status"][] = [
        "applied", "screening", "interview", "offer", "rejected", "ghosted",
      ];
      if (!validStatuses.includes(status as AppliedJob["status"])) {
        console.error(chalk.red(`Invalid status. Choose from: ${validStatuses.join(", ")}`));
        process.exit(1);
      }
      updateStatus(id, status as AppliedJob["status"], noteParts.join(" ") || undefined);
      console.log(chalk.green(`✓ Updated ${id} → ${status}`));
      break;
    }

    default:
      printHelp();
  }
}

function printStatus(): void {
  const jobs = loadAppliedJobs();
  if (jobs.length === 0) {
    console.log(chalk.yellow("No applications tracked yet."));
    return;
  }

  const statusEmoji: Record<AppliedJob["status"], string> = {
    applied: "📤",
    screening: "🔍",
    interview: "🎤",
    offer: "🎉",
    rejected: "❌",
    ghosted: "👻",
  };

  // Group by status
  const grouped = new Map<string, AppliedJob[]>();
  for (const job of jobs) {
    const list = grouped.get(job.status) ?? [];
    list.push(job);
    grouped.set(job.status, list);
  }

  console.log(chalk.bold.cyan(`\n📋  Application Tracker (${jobs.length} total)\n`));

  const order: AppliedJob["status"][] = [
    "offer", "interview", "screening", "applied", "ghosted", "rejected",
  ];

  for (const status of order) {
    const list = grouped.get(status);
    if (!list) continue;
    console.log(chalk.bold(`${statusEmoji[status]}  ${status.toUpperCase()} (${list.length})`));
    for (const job of list) {
      console.log(
        `   ${chalk.white(job.title)} ${chalk.dim(`@ ${job.company}`)} — applied ${job.appliedDate}`
      );
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

function printHelp(): void {
  console.log(`
${chalk.bold.cyan("career-agent")} — personal career manager

${chalk.bold("Commands:")}
  ${chalk.green("search")}               Search job boards for junior / internship roles
  ${chalk.green("status")}               Show all tracked applications grouped by status
  ${chalk.green("reminders")}            Check for overdue follow-ups
  ${chalk.green("update")} <id> <status> [notes]
                        Update an application's status
                        Statuses: applied | screening | interview | offer | rejected | ghosted

${chalk.bold("Examples:")}
  career-agent search
  career-agent update linkedin-123 interview "Call booked for Friday"
  career-agent status
`);
}

main().catch((err) => {
  console.error(chalk.red("\n❌ Fatal error:"), err);
  process.exit(1);
});
