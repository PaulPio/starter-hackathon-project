// Verified live against https://openrouter.ai/api/v1/models on 2026-07-24.
// Change via GEMMA_MODEL_ID env var if the slug changes before the demo.
export const GEMMA_MODEL_ID = process.env.GEMMA_MODEL_ID ?? "google/gemma-4-31b-it";

export const JOBS_SOURCE_URL =
  process.env.JOBS_SOURCE_URL ??
  "https://raw.githubusercontent.com/speedyapply/2027-SWE-College-Jobs/main/README.md";

export const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024; // 5MB

// Optional — raises GitHub API rate limits for tailor-time public repo fetch.
// Unauthenticated requests still work (lower quota).
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";
