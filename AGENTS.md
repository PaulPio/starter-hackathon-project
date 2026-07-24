<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ResumeFit — Project Briefing

## What this is

Built for **305 SummerCodex — Build with Gemma** (Kaggle/GDG hackathon, "Opportunity & Access"
track). Most "AI resume tools" stop at feedback; this closes the loop:

1. Upload a resume PDF (or click "Try with a sample resume" — same pipeline, real data, no
   faking).
2. Gemma extracts a structured profile + a resume "health check" (missing sections, weak
   bullets, honest 0-100 score).
3. ~160+ real internship listings (pulled from a GitHub-hosted community list,
   `speedyapply/2027-SWE-College-Jobs`) are ranked against the profile with a fit score +
   matched-skill evidence — not an opaque number.
4. Click a listing → Gemma tailors the summary/bullets toward it → diff preview → download a
   generated PDF resume with the tailored content baked in.

Deliberately cut from scope: auto-apply, live scraping of LinkedIn/Indeed (fragile, ToS risk).
Tailoring is scoped to a listing's title/company/location only — the data source has no full job
description, and the UI is upfront about that limitation on purpose. Don't "fix" this framing
without understanding it's intentional honesty, not a gap.

Live deployment: `https://starter-hackathon-project.vercel.app`

## Tech stack

Next.js 16 (App Router, TypeScript, Node runtime everywhere), Tailwind + shadcn/ui (built on
`@base-ui/react` — **not** Radix; components use a `render` prop, not `asChild`). Gemma via
OpenRouter (`openai` SDK pointed at OpenRouter's base URL). `zod` v4 (uses native
`z.toJSONSchema()` — do not add the separate `zod-to-json-schema` package, it silently produces
empty schemas against zod v4). `unpdf` for PDF text extraction, `pdf-lib` for PDF generation
(two different concerns, two different files — see file map).

## Architecture / data flow

```
Upload PDF ──► POST /api/parse-resume ──► ResumeProfile (+ raw resumeText, including projects)
                                    │
                                    ▼
                          POST /api/rank ──► RankedJob[]
                                    │
                          user picks one job
                                    ▼
                          POST /api/tailor ──► TailorResponse
                            (fetches public GitHub repos if contact.github is set;
                             faithful bullet rewrites + optional GitHub project adds)
                                    │
                          client merges profile + tailored work/project bullets
                                    ▼
                          POST /api/download-resume ──► PDF bytes (no LLM call)
```

All four API routes: `export const runtime = "nodejs"` + `export const maxDuration = 60`
(Vercel Hobby tier caps functions at 60s). `/api/download-resume` is pure rendering — fast,
no LLM involved.

Frontend is a **single linear state machine**, not a multi-page app:
`components/ResumeFitApp.tsx` owns a `useReducer` and every `fetch` call; everything else is
presentational (props + callbacks in). Steps: `upload → profile → jobs`, plus a tailor `Sheet`
overlay. `app/page.tsx` is the one Server Component — it prefetches `/api/jobs` server-side.

## File map

```
lib/
  config.ts                   GEMMA_MODEL_ID, JOBS_SOURCE_URL, size limits, optional GITHUB_TOKEN
  openrouter.ts                OpenAI SDK client pointed at OpenRouter
  llm.ts                       getStructuredJSON() — the ONE call site every LLM
                                interaction goes through. Read this before adding new
                                LLM calls or touching prompts.
  schemas.ts                   every zod schema — source of truth for data shapes
  resume.ts / rank.ts / tailor.ts   one file per pipeline stage: prompt + call function
  github.ts                    tailor-time public repo fetch (username parse + GitHub API)
  resume-pdf.ts                runtime PDF GENERATION — hard one-page layout (no page 2),
                                base-resume-like sections (no AI summary on the PDF)
  pdf.ts                       PDF text EXTRACTION (unpdf) — do not confuse with resume-pdf.ts
  markdown-table-parser.ts, jobs-source.ts   speedyapply README parsing + snapshot fallback
app/api/
  parse-resume/, jobs/, rank/, tailor/, download-resume/   one route per pipeline stage
components/
  ResumeFitApp.tsx             orchestrator — reducer + all fetches, read this first
  upload/, profile/, jobs/, tailor/, shared/   presentational, grouped by pipeline step
  ui/                          shadcn/ui primitives (base-ui, not Radix)
data/
  jobs-snapshot.json           committed fallback — a network hiccup can't blank the demo
  sample-resume.pdf            bundled "try sample" asset
scripts/
  build-jobs-snapshot.ts, generate-sample-resume.ts, verify-pdf.ts, test-llm.ts, test-github.ts   dev utilities
```

## Things that will bite you if you don't know them

1. **`GEMMA_MODEL_ID` must not have a `:free` suffix.** The free route goes through "Google AI
   Studio," which is aggressively rate-limited (hit a 429 on the very first call during
   development) and less reliable for the JSON-schema-in-prompt pattern this app depends on.
2. **Never rely on `response_format`/JSON-mode/tool-use for structured output.** Confirmed
   Gemma-via-OpenRouter doesn't honor it reliably. `getStructuredJSON()` in `lib/llm.ts` uses
   prompt-embedded JSON Schema + `zod` validation + one bounded repair retry instead — every
   call site degrades gracefully (fallback data, not a 500) if that still fails.
3. **`/api/rank` is deliberately batched.** A single 25-job batch measured **62 seconds** — over
   the 60s Vercel budget. It now pre-filters to 24 candidates (cheap keyword match, no LLM) and
   runs parallel batches of 8, bringing it to ~17-28s. If you change these constants
   (`lib/rank.ts`), re-measure against a real deployment, not just local dev.
4. **`sanitizeForPdf()` in `lib/resume-pdf.ts` has a bullet-character allowlist for a reason.**
   `pdf-lib`'s `StandardFonts` only support WinAnsi encoding; the sanitizer strips anything
   outside `\x00-\xFF` to avoid a draw-time crash — except `•` (U+2022), which is explicitly
   allowed back in because pdf-lib can render it fine and the skills-list separator was silently
   vanishing without this exception. If you add new punctuation to any LLM prompt or PDF
   template, verify it survives this function.
5. **OpenRouter provider routing**: `lib/llm.ts` passes a non-SDK-typed `provider: { order:
   ["CoreWeave", "OpenInference"], allow_fallbacks: true }` field to avoid the default price-sort
   picking the free/rate-limited route. It's a preference, not a hard exclusion.

## Dev workflow

```bash
npm install
cp .env.example .env.local     # fill in OPENROUTER_API_KEY at minimum
npm run dev
```

Required env vars (see `lib/config.ts` for defaults): `OPENROUTER_API_KEY` (no default),
`GEMMA_MODEL_ID`, `JOBS_SOURCE_URL`, `NEXT_PUBLIC_APP_URL`. Optional: `GITHUB_TOKEN` (raises
rate limits for tailor-time public repo fetch; unauthenticated still works).

Useful scripts: `npm run build:jobs-snapshot` (re-fetch + re-parse job listings; refuses to
overwrite on a 0-job parse), `npm run build:sample-resume`, `npx tsx scripts/verify-pdf.ts
<path>` (extract text back out of a generated PDF to sanity-check without opening it manually),
`npx tsx scripts/test-llm.ts` (exercises parse → rank → tailor against a hardcoded sample resume
— faster than clicking through the UI for prompt iteration).

Routes are plain fetchable JSON/multipart endpoints — `curl` them directly during development
rather than going through the UI for LLM-backed routes (15-35s each). `POST
/api/parse-resume?sample=1` skips multipart entirely and reads the bundled sample PDF
server-side.

## Deployment (Vercel)

Linked to `paulpios-projects/starter-hackathon-project`. `npx vercel deploy --prod` after
`vercel login` (interactive). **Environment variables must be set separately for Production and
Preview** — a common gotcha where it works locally but 500s on deploy because a var was only
added to one environment. After any route-touching deploy, smoke-test the live URL directly with
`curl --max-time 90` — serverless cold starts and `maxDuration` limits only surface against real
infra, not local dev.
