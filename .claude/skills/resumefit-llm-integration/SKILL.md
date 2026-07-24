---
name: ResumeFit-LLM-Integration
description: Use when modifying prompts, LLM calls, or OpenRouter/Gemma config in ResumeFit, or debugging errors like rate limits (429), malformed JSON from the model, or requests routing to the wrong provider.
---

# ResumeFit ↔ Gemma/OpenRouter Integration

**REQUIRED BACKGROUND:** read resumefit-overview first if you haven't — this assumes you know
the pipeline shape.

## The core pattern: never trust structured-output mode

`lib/llm.ts`'s `getStructuredJSON()` is the single call site every LLM interaction goes through
(`lib/resume.ts`, `lib/rank.ts`, `lib/tailor.ts` all call it). It does **not** use
`response_format`/JSON-mode/tool-use — confirmed by direct testing that Gemma-via-OpenRouter
does not reliably honor those. Instead: the zod schema is serialized via `z.toJSONSchema()` and
embedded as prompt text, the raw response is parsed + `schema.safeParse()`'d, and on failure the
validation error is fed back for one bounded repair attempt (`maxRepairAttempts`, default 1 —
kept low to protect the 60s Vercel function budget). Every call site catches
`LLMStructuredOutputError` and degrades gracefully (fallback profile, keyword-order ranking,
user-facing retry toast) rather than 500ing.

**If you're adding a new LLM call:** use `getStructuredJSON()`, don't reach for
`response_format` even if OpenRouter's docs suggest it works for a given model — this codebase's
position is "don't depend on it," verified the hard way.

## Provider routing — the `:free` trap

`GEMMA_MODEL_ID` (env var, default `google/gemma-4-31b-it` in `lib/config.ts`) must **not** have
a `:free` suffix. The free-tier route goes through "Google AI Studio," which is aggressively
rate-limited (hit a 429 on the very first call in testing) and doesn't support the JSON-schema
embedding pattern as reliably. If you see `"X:free is temporarily rate-limited upstream"` in an
error, check `GEMMA_MODEL_ID` in `.env.local` for a stray `:free` — this exact bug happened once
already.

`lib/llm.ts` also passes an OpenRouter-specific `provider: { order: ["CoreWeave",
"OpenInference"], allow_fallbacks: true }` field (not in the `openai` SDK's TS types, added via
an `as` cast) to prefer paid, low-latency providers over whatever OpenRouter's default price-sort
would pick. This is a *preference*, not a hard exclusion — `allow_fallbacks: true` means it can
still fall through to another provider if those two are unavailable.

Separately, `createCompletionWithBackoff()` retries specifically on HTTP 429 (up to 3 attempts,
1s/3s/8s backoff) — this is a distinct concern from the JSON-repair retry above; a 429 means no
completion was produced at all, nothing to repair.

## Verifying the live model list

Don't trust a hardcoded model ID from memory/training data — model availability on OpenRouter
changes. Check live via:
```bash
curl -s https://openrouter.ai/api/v1/models | node -e "..."  # filter for 'gemma' in .data[].id
curl -s "https://openrouter.ai/api/v1/models/<id>/endpoints"  # see which providers serve it,
                                                                 # and whether they support
                                                                 # structured_outputs
```
(`WebFetch` on these URLs tends to truncate/summarize a large JSON array unreliably — use `curl`
+ `node -e` instead, as this codebase's own setup process discovered.)

## `/api/rank` is deliberately batched, not one big call

`lib/rank.ts` caps candidates to `MAX_CANDIDATES = 24` (cheap keyword pre-filter, no LLM) and
splits them into parallel batches of `BATCH_SIZE = 8` via `Promise.all`. This was tuned from a
measured regression: one batch of 25 jobs took **62 seconds** — over the 60s `maxDuration`
budget. Splitting into parallel batches of 8 brought it to ~17-28s. If ranking quality feels
constrained by these numbers, raise them cautiously and **re-measure wall-clock time against a
real deployment**, not just local dev — cold starts and provider load both add latency local
testing won't show.

## `sanitizeForPdf` — WinAnsi encoding

`lib/resume-pdf.ts` renders with `pdf-lib`'s `StandardFonts`, which only support WinAnsi
encoding. LLM output (and extracted resume text) regularly contains smart quotes, em/en dashes,
and ellipsis characters that throw at `drawText` time otherwise. `sanitizeForPdf()` normalizes
these — but its final catch-all strips anything outside `\x00-\xFF` **except an explicit bullet
character allowlist**. This was a real bug found during testing: the bullet separator between
skills was silently disappearing because `•` (U+2022) is outside Latin-1 range. If you add new
punctuation to any LLM-facing prompt or PDF template, check it survives `sanitizeForPdf` — don't
assume "prints fine in a terminal" means "prints fine in a WinAnsi PDF."

## Cost/reliability notes

Buy OpenRouter credit before heavy iteration — the free tier caps at 50 requests/day, easily
exhausted in an hour of prompt-tuning. The paid Gemma tier used here costs fractions of a cent
per call (~$0.10-0.45 per million tokens depending on provider).
