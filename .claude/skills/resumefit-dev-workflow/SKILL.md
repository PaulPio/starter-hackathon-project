---
name: ResumeFit-Dev-Workflow
description: Use when running ResumeFit locally, setting environment variables, regenerating bundled data (job snapshot, sample resume), or deploying to Vercel.
---

# ResumeFit Dev Workflow

**REQUIRED BACKGROUND:** resumefit-overview for architecture, resumefit-llm-integration if
touching anything LLM-related.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in OPENROUTER_API_KEY at minimum
npm run dev
```

Required env vars (`lib/config.ts` has defaults for everything except the API key):
- `OPENROUTER_API_KEY` — no default, required. No `:free` suffix on the model — see
  resumefit-llm-integration.
- `GEMMA_MODEL_ID` — defaults to `google/gemma-4-31b-it`; verify this is still live before
  assuming it, see resumefit-llm-integration.
- `JOBS_SOURCE_URL` — defaults to the speedyapply README raw URL.
- `NEXT_PUBLIC_APP_URL` — used only for the OpenRouter `HTTP-Referer` header, low stakes.

## Dev utility scripts

```bash
npm run build:jobs-snapshot   # re-fetches + re-parses the speedyapply README into
                                # data/jobs-snapshot.json (the demo's offline-safe fallback)
npm run build:sample-resume   # regenerates data/sample-resume.pdf from scripts/generate-sample-resume.ts
npx tsx scripts/verify-pdf.ts <path>   # extracts text back out of a generated PDF to sanity-check
                                          # content/wrapping/pagination without opening it manually
npx tsx scripts/test-llm.ts            # exercises parse → rank → tailor against a hardcoded sample
                                          # resume; useful for smoke-testing prompt changes without
                                          # going through the UI
```

`build:jobs-snapshot` refuses to overwrite the snapshot if it parses 0 jobs (protects against a
silent upstream format change wiping the fallback data) — check its output.

## Testing a route directly (bypass the UI)

The app's own routes are plain fetch-able JSON/multipart endpoints — during development it's
often faster to `curl` them directly than to click through the UI, especially for LLM calls that
take 15-35s:

```bash
curl -s -X POST http://localhost:3000/api/parse-resume?sample=1 -o out.json
curl -s -X POST http://localhost:3000/api/rank -H "Content-Type: application/json" \
  -d '{"profile": ...}' -o out.json
```

Note `?sample=1` on `parse-resume` skips multipart entirely and reads `data/sample-resume.pdf`
server-side — no file upload needed for smoke testing.

## Deployment (Vercel)

Project is linked (`.vercel/project.json`, gitignored) to `paulpios-projects/starter-hackathon-project`.
Production URL: `https://starter-hackathon-project.vercel.app`.

```bash
npx vercel login       # interactive — needs a human to click through
npx vercel link --yes  # only needed once per machine/checkout
npx vercel deploy --prod
```

Environment variables must be set **separately for Production and Preview** — this is a common
gotcha (works locally via `.env.local`, 500s on deploy because the var was only added to one
environment):
```bash
printf '%s' "$VALUE" | npx vercel env add VAR_NAME production
printf '%s' "$VALUE" | npx vercel env add VAR_NAME preview
```

After any deploy touching an API route, smoke-test the live URL directly (don't assume "builds
successfully" means "works at runtime" — serverless cold starts and `maxDuration` limits only
show up against real infra):
```bash
curl -s -X POST https://starter-hackathon-project.vercel.app/api/parse-resume?sample=1 \
  -w "HTTP %{http_code} in %{time_total}s\n" --max-time 90
```

## Known environment quirks (Windows / Git Bash)

- `curl`'s default timeout is short; LLM-backed routes need `--max-time 60` or higher or the
  client gives up before the server would have succeeded.
- `.bin/tsx` shell shims don't execute correctly via `node .bin/tsx` on Windows Git Bash — use
  `npx tsx <script>` instead.
- To load `.env.local` into a bare `node`/`tsx` script (not through Next's own env loading), use
  `set -a; source .env.local; set +a` before the command, or `node --env-file=.env.local` — don't
  hardcode secrets into throwaway scripts.
