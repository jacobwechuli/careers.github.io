# Career Agent

A personal career manager that scrapes job boards on demand to surface junior and internship roles matching your profile.

## What it does

When you click **Search Now** (UI) or run `npm run search` (CLI), it:

1. **Scrapes** LinkedIn, MyJobMag, Indeed, Glassdoor, CWJobs, and Reed for roles in software engineering, software development, AI engineering/solutions, and DevOps
2. **Filters** to **junior and internship roles only** — any title without a junior / graduate / intern / trainee / entry-level signal is dropped before it reaches you
3. **Deduplicates** across all six boards so you never see the same listing twice
4. **Returns** a list of matching jobs directly in the UI or terminal

Tracked applications (from the Apply from URL flow) are stored in `data/applications.json` and available in the Applications view.

### Target Companies

Upload an Excel file (`.xlsx`) containing companies you want to work for:

- **Columns**: `Company` (required), `URL` (optional), `Notes` (optional)
- **Manage**: View all target companies, mark favourites, add notes
- **Integration**: Stored in your profile and surfaced alongside search results

---

## Setup

### 1. Install dependencies

```bash
npm install
cd ui && npm install
```

### 2. Set environment variables

Create a `.env` file at the project root:

```bash
# Groq — used for CV tailoring, cover letter generation, and job scoring
GROQ_API_KEY=gsk_...
```

> No third-party job board API keys are needed — all boards are scraped directly.

### 3. Fill in your profile

Parse your CV automatically in the UI (**Profile → paste CV text → Parse**), or copy the example and edit manually:

```bash
cp data/profile.example.json data/profile.json
```

Edit `data/profile.json` with your real CV, skills, target roles, and location preferences.

---

## Usage

### Web UI

```bash
npm run dev:api   # start the backend API (port 3001)
npm run dev:ui    # start the frontend (port 5173)
```

Open `http://localhost:5173`. From the Dashboard, click **Search Now** to scrape all boards and see results inline.

### CLI

```bash
# Search job boards for junior / internship roles
npm run search

# View all tracked applications grouped by status
npm run status

# Check overdue follow-up reminders
npm run reminders

# Update an application's status
npx tsx src/index.ts update linkedin-123 interview "Call booked for Friday"
```

### Apply from URL

Paste any job posting URL into **Apply from URL** in the UI. The agent will:

1. Scrape the posting
2. Score it against your CV (0–100) with match reasons and missing skills
3. Tailor your CV summary and bullet points
4. Draft a cover letter

### Application statuses

| Status | Meaning |
|---|---|
| `applied` | Application sent, waiting |
| `screening` | HR / recruiter screen scheduled |
| `interview` | Technical interview stage |
| `offer` | Offer received |
| `rejected` | Rejected |
| `ghosted` | No response after follow-up |

---

## Architecture

```
src/
  profile/
    types.ts        ← TypeScript interfaces (Profile, AppliedJob, etc.)
    profile.ts      ← load/save profile.json, profileToText() for LLM prompts
    parser.ts       ← LLM-based CV text → Profile parser
  jobs/
    types.ts        ← RawJob, ScoredJob interfaces
    search.ts       ← search queries + junior/internship filter, calls crawler
    crawler.ts      ← LinkedIn, MyJobMag, Indeed, Glassdoor, CWJobs, Reed scrapers
    scorer.ts       ← Groq batch scorer (llama-3.3-70b)
    scraper.ts      ← single job URL scraper (for Apply from URL)
    tracker.ts      ← applications.json read/write
    excelParser.ts  ← Excel parser for target companies
  cv/
    tailor.ts       ← CV tailoring via Groq
    coverLetter.ts  ← cover letter generation via Groq
  reminders/
    reminders.ts    ← follow-up reminder checker
  server/
    app.ts          ← Express API
    index.ts        ← server entry point
  index.ts          ← CLI entry point
data/
  profile.json          ← your CV (gitignore this)
  profile.example.json  ← template to copy
  applications.json     ← application tracker
ui/
  src/
    views/
      DashboardView.vue     ← Search Now + results table
      ApplicationsView.vue  ← track application statuses
      ApplyFromUrlView.vue  ← paste a job URL to get CV + cover letter
      CompaniesView.vue     ← target companies upload & management
      ProfileView.vue       ← CV editor and parser
      RemindersView.vue     ← follow-up reminders
```
