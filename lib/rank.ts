import { getStructuredJSON, LLMStructuredOutputError } from "./llm";
import {
  RankingResponseSchema,
  type JobListing,
  type RankedJob,
  type ResumeProfile,
} from "./schemas";

const MAX_CANDIDATES = 24;
const BATCH_SIZE = 8; // measured: a single 25-job batch took ~62s (over the 60s
// Vercel maxDuration budget). Splitting into small batches run in parallel keeps
// wall-clock close to one batch's time instead of the sum of all of them.

// Cheap, LLM-free pre-filter: score each job by keyword overlap between the
// profile's skills/target roles and the job's title, so the (slower, costlier,
// less reliable) LLM call only ever has to reason about a small, relevant set.
function prefilterCandidates(jobs: JobListing[], profile: ResumeProfile): JobListing[] {
  const keywords = [...profile.skills, ...profile.targetRoles]
    .map((k) => k.toLowerCase().trim())
    .filter(Boolean);

  const scored = jobs.map((job) => {
    const haystack = `${job.position} ${job.category}`.toLowerCase();
    const score = keywords.reduce((acc, kw) => (haystack.includes(kw) ? acc + 1 : acc), 0);
    return { job, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // If keyword overlap found nothing useful (e.g. a very generic profile),
  // still return a candidate set rather than an empty list.
  const withSignal = scored.filter((s) => s.score > 0);
  const pool = withSignal.length >= 5 ? withSignal : scored;
  return pool.slice(0, MAX_CANDIDATES).map((s) => s.job);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

const SYSTEM_PROMPT = `You are helping a job seeker (often without access to a curated pipeline of leads,
e.g. a first-generation student or someone outside a traditional CS pipeline) triage a list of
real internship postings against their resume profile.

For each candidate job, return:
- "fitScore" (0-100): how well this specific listing fits the candidate's actual skills and
  experience level — be honest and differentiate, don't cluster everything around 70-80.
- "why": ONE short, specific sentence (max ~15 words) explaining the score — reference concrete
  skills/experience, not generic praise.
- "matchedSkills": the subset of the candidate's own skills/background that are genuinely relevant
  to this specific listing's title (can be empty if none are relevant).

Return a ranking for every job id you were given, in the same set (order doesn't matter).`;

async function rankBatch(
  profileSummary: object,
  batch: JobListing[]
): Promise<RankedJob[]> {
  const candidateSummaries = batch.map((c) => ({
    id: c.id,
    company: c.company,
    position: c.position,
    location: c.location,
  }));

  try {
    const { rankings } = await getStructuredJSON({
      schema: RankingResponseSchema,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `Candidate profile:\n${JSON.stringify(profileSummary)}\n\nJob listings:\n${JSON.stringify(candidateSummaries)}`,
      temperature: 0.3,
      timeoutMs: 25_000,
    });

    const byId = new Map(rankings.map((r) => [r.id, r]));
    return batch.map((job) => {
      const scored = byId.get(job.id);
      return {
        ...job,
        fitScore: scored?.fitScore ?? null,
        why: scored?.why ?? null,
        matchedSkills: scored?.matchedSkills ?? [],
      };
    });
  } catch (e) {
    if (e instanceof LLMStructuredOutputError) {
      // Degrade this batch to keyword-prefilter order rather than dropping it
      // (or the whole list) on the floor.
      return batch.map((job) => ({ ...job, fitScore: null, why: null, matchedSkills: [] }));
    }
    throw e;
  }
}

export async function rankJobs(
  profile: ResumeProfile,
  jobs: JobListing[]
): Promise<RankedJob[]> {
  const candidates = prefilterCandidates(jobs, profile);
  if (candidates.length === 0) return [];

  const profileSummary = {
    skills: profile.skills,
    experienceLevel: profile.experienceLevel,
    targetRoles: profile.targetRoles,
  };

  const batches = chunk(candidates, BATCH_SIZE);
  const results = await Promise.all(batches.map((batch) => rankBatch(profileSummary, batch)));
  const ranked = results.flat();
  ranked.sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1));
  return ranked;
}
