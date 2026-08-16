# Career Agent

A personal career manager that runs every morning to find, score, and prepare applications for junior software / AI engineering roles.

## What it does

Every morning, it:
1. **Searches** Adzuna (UK), Remotive (remote), LinkedIn, Indeed, Glassdoor, CWJobs, and Reed for jobs matching your target roles
2. **Pre-filters** using keyword/anti-keyword rules from your profile
3. **Scores** each job 0–100 against your CV using GPT-4o-mini, with match reasons and missing skills
4. For every job above the threshold it:
   - **Tailors your CV** summary and selects the most relevant experience bullets
   - **Drafts a cover letter** (short, human, non-corporate)
   - Saves everything to `data/output/<date>/<company>/`
5. **Tracks** every application in `data/applied-jobs.json`
6. **Reminds** you to follow up 7 days after applying

### Target Companies Feature

Upload an Excel file (.xlsx, .xls) containing companies you want to work for:
- **Columns**: `Company` (required), `URL` (optional), `Notes` (optional)
- **Manage**: View all target companies, mark favorites, track job counts per company
- **Integration**: Companies are added to your profile preferences and used during job scoring

---

## Setup

### 1. Install dependencies

```bash
cd career-agent
npm install
```

### 2. Set environment variables

Create a `.env` file (or export in your shell):

```bash
GROQ_API_KEY=gsk_...

# Optional — Adzuna UK job board (free tier available)
# Register at https://developer.adzuna.com
ADZUNA_APP_ID=your-app-id
ADZUNA_APP_KEY=your-app-key

# Email — Resend (resend.com, free tier: 3 000 emails/month)
RESEND_API_KEY=re_...
EMAIL_TO=you@gmail.com            # your personal inbox
EMAIL_FROM=career@yourdomain.com  # must be a verified Resend sender domain
```

> Without Adzuna keys the agent will still run using Remotive (remote jobs only).
> Without Resend keys emails are skipped silently — everything else still works.

### 3. Fill in your profile

```bash
cp data/profile.example.json data/profile.json
```

Edit `data/profile.json` with your real CV, skills, target roles, and preferences. The file is self-documenting.

---

## Usage

```bash
# Daily job hunt (also sends the daily digest email, + weekly report on Fridays)
npm run morning

# View all tracked applications
npm run status

# Check overdue follow-ups
npm run reminders

# Send the weekly report email right now
npm run report

# Update an application's status
npx tsx src/index.ts update adzuna-123 interview "Call booked for Friday"
```

### Emails

**Daily digest** — sent every morning after the run:
- All scored jobs with score, APPLY / STRETCH label, and match reasons
- Overdue follow-up reminders

**Friday weekly report** — sent automatically when `morning` runs on a Friday, or trigger manually any time with `npm run report`:
- Applied this week vs. all-time total
- Full pipeline breakdown (screening → interview → offer → rejected)
- Response rate

### Application statuses

| Status | Meaning |
|---|---|
| `applied` | Application sent, waiting |
| `screening` | HR/recruiter screen scheduled |
| `interview` | Technical interview stage |
| `offer` | Offer received |
| `rejected` | Rejected |
| `ghosted` | No response after follow-up |

---

## Output structure

Each morning run writes to `data/output/<YYYY-MM-DD>/<company-role>/`:

```
data/output/
  2024-08-01/
    revolut-junior-software-engineer/
      job.json          ← full job posting snapshot + score
      cv-tailored.json  ← tailored summary, highlighted bullets, skills to lead with
      cover-letter.txt  ← ready-to-send cover letter
```

---

## Automating the morning run

### macOS / Linux (cron)
```bash
# Run at 08:00 every weekday
0 8 * * 1-5 cd /path/to/career-agent && npx tsx src/index.ts morning >> ~/career-agent.log 2>&1
```

### Windows (Task Scheduler)
Create a task that runs:
```
node "C:\path\to\career-agent\build\index.js" morning
```

---

## Architecture

```
src/
  profile/
    types.ts        ← TypeScript interfaces for Profile, AppliedJob, etc.
    profile.ts      ← load/save profile.json, profileToText() for LLM prompts
  jobs/
    types.ts        ← RawJob, ScoredJob interfaces
    search.ts       ← Adzuna + Remotive + Web Crawler search, pre-filtering
    crawler.ts      ← LinkedIn, Indeed, Glassdoor, CWJobs, Reed scraping
    scorer.ts       ← GPT-4o-mini batch scorer
    tracker.ts      ← applied-jobs.json read/write
    excelParser.ts  ← Excel file parser for target companies
  cv/
    tailor.ts       ← GPT CV tailoring
    coverLetter.ts  ← GPT cover letter generation
  reminders/
    reminders.ts    ← follow-up reminder checker
  agent/
    morning.ts      ← main orchestration loop
  index.ts          ← CLI entry point
data/
  profile.json          ← your CV (gitignore this)
  profile.example.json  ← template to copy
  applied-jobs.json     ← application tracker
  output/               ← generated CV materials
ui/
  src/
    views/
      CompaniesView.vue  ← Target companies upload & management UI
```
