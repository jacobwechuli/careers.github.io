/**
 * Reminder checker — prints follow-up reminders for stale applications.
 */
import chalk from "chalk";
import { getDueFollowUps } from "../jobs/tracker.js";

export function checkReminders(): void {
  const due = getDueFollowUps();

  if (due.length === 0) {
    console.log(chalk.green("✓ No follow-ups due today."));
    return;
  }

  console.log(chalk.yellow(`\n⏰  Follow-up reminders (${due.length}):\n`));
  for (const job of due) {
    console.log(
      chalk.bold(`  ${job.title}`) +
        chalk.dim(` @ ${job.company}`) +
        chalk.red(` — follow up now! (applied ${job.appliedDate})`)
    );
    console.log(chalk.dim(`     ${job.url}`));
    if (job.notes) console.log(chalk.dim(`     Notes: ${job.notes}`));
    console.log();
  }
}
