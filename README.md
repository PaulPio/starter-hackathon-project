# ResumeFit

Built for **305 SummerCodex — Build with Gemma** (Opportunity & Access track).

Most "AI resume tools" stop at feedback. ResumeFit closes the loop: upload a resume, get an
honest health check, see it ranked against hundreds of real, currently-refreshed internship
postings, and tailor it toward one specific listing — all in one sitting, built for students who
don't have a campus career center curating leads for them.

## What it does

1. **Upload** a PDF resume (or click "Try with a sample resume" — it runs the exact same
   pipeline, nothing is faked).
2. **Health check** — Gemma extracts a structured profile (skills, experience, education) and
   flags what's holding the resume back: missing sections, vague bullets, weak phrasing. Framed
   around equity, not just optimization — many strong candidates get filtered out by automated
   screening for formatting reasons, not skill gaps.
3. **Ranked matches** — real internship listings (pulled from
   [speedyapply/2027-SWE-College-Jobs](https://github.com/speedyapply/2027-SWE-College-Jobs), a
   community-maintained list, ~160+ live postings) scored against the candidate's actual profile.
   Every score comes with matched-skill evidence and a one-line "why," not an opaque number.
4. **Tailor** — click a listing and Gemma rewrites the resume summary and bullets to emphasize
   what's relevant to that specific title/company — shown as a diff, downloadable. We're upfront
   that this is scoped to the listing's title/company/location, since the data source doesn't
   include full job descriptions — no invented requirements.

## Why Gemma, specifically

This isn't one prompt reused three times — it's a three-stage pipeline with a distinct,
schema-validated output shape at each stage (profile+health-check extraction → batched fit
scoring with evidence → constrained rewriting that isn't allowed to fabricate). Gemma (via
OpenRouter, `google/gemma-4-31b-it`) is open-weight, cheap enough to run that whole chain per
user for fractions of a cent, and fast enough to keep each stage under a few seconds — the
combination that makes a real-time, multi-call pipeline like this practical for a free student
tool rather than a paid one.

## Tech stack

- Next.js 16 (App Router, TypeScript), Tailwind, shadcn/ui
- Gemma via [OpenRouter](https://openrouter.ai) (`openai` SDK pointed at OpenRouter's API)
- `unpdf` for PDF text extraction, `zod` for schema validation everywhere an LLM output crosses
  a boundary
- Job data: a header-name-mapped markdown table parser against the speedyapply README, snapshotted
  to `data/jobs-snapshot.json` so a network hiccup or upstream format change can't blank the demo

## Known limitations (stated on purpose, not discovered by a judge)

- Tailoring uses the listing's title/company/location only — the data source has no full job
  description, so nothing is invented beyond that.
- Listings show "posted N days ago," never "currently open" — we don't have close dates.
- Auto-apply and live scraping of LinkedIn/Indeed were deliberately cut from scope: fragile,
  against most job boards' ToS, and not something you can responsibly ship in a hackathon day.

## Running locally

```bash
npm install
cp .env.example .env.local   # add your OPENROUTER_API_KEY
npm run dev
```

Optional: refresh the bundled job snapshot or sample resume:

```bash
npm run build:jobs-snapshot
npm run build:sample-resume
```
