import { getStructuredJSON } from "./llm";
import { TailorResponseSchema, type JobListing, type ResumeProfile, type TailorResponse } from "./schemas";

const MAX_BULLETS = 6;

const SYSTEM_PROMPT = `You are helping a job seeker tailor their resume toward one specific internship listing.

Important limitation: you only know this listing's title, company, and location — not its full
job description. Tailor toward what that title/company/location signals about the role, and do
not invent specific requirements the listing didn't state.

Rewrite each provided bullet to better emphasize relevance to this specific role (reorder emphasis,
sharpen action verbs, surface relevant keywords already true of the candidate) — never fabricate
skills, technologies, or achievements not already present in the original bullet or resume text.
Also write a short 2 sentence professional summary tailored to this role.
For each rewritten bullet, include a "reason": max ~10 words, naming what changed.`;

export async function tailorResume(
  profile: ResumeProfile,
  resumeText: string,
  job: JobListing
): Promise<TailorResponse> {
  const originalBullets = profile.workExperience
    .flatMap((exp) => exp.bullets.map((bullet) => ({ company: exp.company, title: exp.title, bullet })))
    .slice(0, MAX_BULLETS);

  const userPrompt = `Target listing:
Company: ${job.company}
Title: ${job.position}
Location: ${job.location}

Candidate's target roles: ${profile.targetRoles.join(", ") || "(none extracted)"}
Candidate's skills: ${profile.skills.join(", ") || "(none extracted)"}

Original resume text (for context only):
"""
${resumeText.slice(0, 4000)}
"""

Bullets to rewrite (return one tailored version per original bullet, in the same order):
${JSON.stringify(originalBullets.map((b) => b.bullet))}`;

  return getStructuredJSON({
    schema: TailorResponseSchema,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.5,
    timeoutMs: 20_000,
  });
}
