---
name: ResumeFit-Overview
description: Use when first orienting in the ResumeFit codebase, before making any change — explains what the app does, its architecture, data flow, and file map.
---

# ResumeFit Overview

## What this is

ResumeFit was built for **305 SummerCodex — Build with Gemma** (a Kaggle/GDG hackathon,
"Opportunity & Access" track). It closes the loop that most "AI resume tools" stop short of:

1. Upload a resume PDF (or click "Try with a sample resume" — same pipeline, real data).
2. Gemma extracts a structured profile + does a resume "health check" (missing sections, weak
   bullets, honest score).
3. Real internship listings (~160+, pulled from a GitHub-hosted community list) are ranked
   against the profile with a fit score + matched-skill evidence, not an opaque number.
4. Click a listing → Gemma tailors the summary/bullets toward it → preview a diff → download a
   generated PDF resume.

Auto-apply and live scraping of LinkedIn/Indeed were deliberately cut from scope (fragile, ToS
risk). Tailoring is scoped to a listing's title/company/location only — the data source has no
full job description, and the app is upfront about that in its own UI copy.

## Tech stack

Next.js 16 (App Router, TypeScript), Tailwind + shadcn/ui (built on `@base-ui/react`, **not**
Radix — components use a `render` prop pattern, not `asChild`). Gemma via OpenRouter (`openai`
SDK). `zod` (v4 — uses native `z.toJSONSchema()`, not the `zod-to-json-schema` package, which is
broken against zod v4). `unpdf` for PDF text extraction, `pdf-lib` for PDF generation.

## Data flow / pipeline

```
Upload PDF ──► /api/parse-resume ──► ResumeProfile (+ resumeText)
                                          │
                                          ▼
                                    /api/rank ──► RankedJob[]
                                          │
                                    user picks one
                                          ▼
                                    /api/tailor ──► TailorResponse (summary + bullets)
                                          │
                                    client merges profile.workExperience + tailoredBullets
                                          ▼
                                    /api/download-resume ──► PDF bytes
```

All four routes are Node-runtime Route Handlers with `export const maxDuration = 60` (Vercel
Hobby tier caps functions at 60s max; `/api/rank` is the tightest — see
resumefit-llm-integration for why it's batched). `/api/download-resume` is pure rendering, no
LLM call, sub-second.

## Frontend architecture

Single linear state machine, not a multi-page app: `components/ResumeFitApp.tsx` owns a
`useReducer` and all four `fetch` calls; every other component is presentational, receiving
state + callbacks as props. Steps: `upload → profile → jobs`, plus a tailor `Sheet` overlay that
can open from the jobs step. `app/page.tsx` is the one Server Component — it prefetches
`/api/jobs` so the list is warm before the user finishes uploading.

## File map

```
lib/
  config.ts          GEMMA_MODEL_ID, JOBS_SOURCE_URL, size limits
  openrouter.ts       OpenAI SDK client pointed at OpenRouter
  llm.ts              getStructuredJSON() — see resumefit-llm-integration
  schemas.ts          every zod schema (ResumeProfile, JobListing, RankedJob,
                       TailorResponse, ResumePdfData) — the source of truth for data shapes
  resume.ts           resume-parsing prompt + parseResumeProfile()
  rank.ts             pre-filter + batched ranking prompt + rankJobs()
  tailor.ts           tailoring prompt + tailorResume()
  resume-pdf.ts        runtime PDF generator (word-wrap + pagination, pdf-lib)
  pdf.ts              unpdf-based PDF text extraction (extraction, NOT generation —
                       don't confuse with resume-pdf.ts)
  markdown-table-parser.ts + jobs-source.ts   speedyapply README parsing + snapshot fallback
app/api/
  parse-resume/route.ts    multipart PDF upload (or ?sample=1) → profile
  jobs/route.ts             cached/snapshotted job listings
  rank/route.ts              profile → ranked jobs
  tailor/route.ts            profile + job → tailored summary/bullets
  download-resume/route.ts   ResumePdfData → PDF bytes (no LLM call)
components/
  ResumeFitApp.tsx    orchestrator — reducer + all fetches, read this first
  upload/, profile/, jobs/, tailor/, shared/   presentational, by pipeline step
  ui/                  shadcn/ui primitives (base-ui, not Radix)
data/
  jobs-snapshot.json   committed fallback so a network hiccup can't blank the demo
  sample-resume.pdf    bundled "try sample" asset, regenerate via npm run build:sample-resume
scripts/
  build-jobs-snapshot.ts, generate-sample-resume.ts, verify-pdf.ts, test-llm.ts   dev utilities
```

## Where to look for what

- Changing what the resume parser extracts → `lib/resume.ts` (prompt) + `lib/schemas.ts`
  (`ResumeProfileSchema`) — keep both in sync, the schema is what actually gets validated.
- Changing ranking logic → `lib/rank.ts` (pre-filter + prompt), watch the `BATCH_SIZE`/
  `MAX_CANDIDATES` constants — see resumefit-llm-integration for why they're small.
- Changing the tailor/PDF output → `lib/tailor.ts` (LLM side) and `lib/resume-pdf.ts` (rendering
  side) are separate; the merge between them happens client-side in
  `components/tailor/DownloadButton.tsx`.
- UI copy about honesty/limitations (e.g. "posted N days ago" not "currently open", the
  tailoring-scope caption) is intentional messaging from the hackathon pitch — don't casually
  rewrite it without knowing why (see README.md's "Known limitations" section).
