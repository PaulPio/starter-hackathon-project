import { fetchPublicRepos, parseGithubUsername, type GithubRepo } from "./github";
import { getStructuredJSON } from "./llm";
import { TailorResponseSchema, type JobListing, type ResumeProfile, type TailorResponse } from "./schemas";

const MAX_BULLETS = 6;
const MAX_GITHUB_ADDS = 1;
const MAX_PROJECTS_ON_PAGE = 3;

const SYSTEM_PROMPT = `You are helping a job seeker lightly tailor a ONE-PAGE resume toward one internship listing.

Important limitation: you only know this listing's title, company, and location — not its full
job description. Tailor toward what that title/company/location signals about the role, and do
not invent specific requirements the listing didn't state.

Faithfulness rules (strict — the downloaded PDF must stay similar to the base resume):
- Prefer SMALL edits: swap a verb, surface an existing keyword, tighten phrasing. Do NOT expand
  bullets. Each tailored bullet must be roughly the SAME LENGTH as its original (within ~20%).
- Preserve the meaning of every original work and project bullet. Never add employers, metrics,
  tools, or achievements that are not evidenced in the original bullet or resume text.
- Echo each "original" string VERBATIM (exact characters) so the client can merge by string match.
- The professional summary is for the UI preview only (exactly 2 short sentences from facts already
  in the resume). It will NOT appear on the PDF.

Projects — reorder / drop when it helps the one-page fit:
- Return "projectOrder": the names of resume projects to KEEP, most relevant first (exact names
  from the resume projects list). Omit a project to delete it from the tailored PDF when it is
  weak for this listing or crowding the page. Keep at least 1 if any projects exist, and at most
  ${MAX_PROJECTS_ON_PAGE}.
- For every KEPT project, include a tailoredProjects entry (same name; lightly rewritten bullets).
- For every DROPPED project, include a removedProjects entry with name + short reason.
- If all projects still fit and are relevant, keep them all (just reorder if useful).

Skills — reorder / drop only (never invent):
- Return "tailoredSkills": a reordered subset of the candidate's EXISTING skills, putting the most
  relevant to this listing first. You may drop skills that are clearly irrelevant for this role
  to save space. Do NOT add skills that are not already in the candidate's skills list.
- Include a short "skillsReason" (max ~15 words) explaining the reorder/drops.

GitHub enrichment (optional, one-page budget):
- You may receive public GitHub repos. Select at most ${MAX_GITHUB_ADDS} repo that is NOT already
  listed in resume projects (case-insensitive name match) and clearly fits the listing signal.
- Prefer returning an EMPTY addedGithubProjects array unless the repo clearly strengthens the fit.
- For a selected repo: 1 short bullet only, grounded ONLY in description/language/topics — no
  fabricated metrics.
- For each rewritten bullet and each GitHub add, include a short "reason" (max ~10 words).`;

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function filterReposNotOnResume(repos: GithubRepo[], profile: ResumeProfile): GithubRepo[] {
  const existing = new Set(profile.projects.map((p) => normalizeName(p.name)));
  return repos.filter((r) => !existing.has(normalizeName(r.name)));
}

function resolveSkill(candidate: string, allowed: string[]): string | null {
  const needle = candidate.trim().toLowerCase();
  if (!needle) return null;
  const exact = allowed.find((s) => s.trim().toLowerCase() === needle);
  if (exact) return exact;
  // Soft match: allow "React.js" ↔ "React" style only when one contains the other.
  const soft = allowed.find((s) => {
    const a = s.trim().toLowerCase();
    return a.includes(needle) || needle.includes(a);
  });
  return soft ?? null;
}

/** Drop invented skills; preserve model order for ones that exist on the resume. */
export function sanitizeTailoredSkills(profileSkills: string[], proposed: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const skill of proposed) {
    const resolved = resolveSkill(skill, profileSkills);
    if (!resolved) continue;
    const key = resolved.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(resolved);
  }
  return out.length > 0 ? out : profileSkills;
}

/** Keep only real resume project names; fall back to original order if model returns nothing usable. */
export function sanitizeProjectOrder(
  profileProjects: { name: string }[],
  proposedOrder: string[],
  removedNames: string[]
): string[] {
  if (profileProjects.length === 0) return [];

  const byNorm = new Map(profileProjects.map((p) => [normalizeName(p.name), p.name] as const));
  const removed = new Set(removedNames.map(normalizeName));

  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const name of proposedOrder) {
    const canonical = byNorm.get(normalizeName(name));
    if (!canonical) continue;
    const key = normalizeName(canonical);
    if (seen.has(key) || removed.has(key)) continue;
    seen.add(key);
    ordered.push(canonical);
  }

  if (ordered.length === 0) {
    // Model forgot projectOrder — keep all except explicitly removed.
    return profileProjects.filter((p) => !removed.has(normalizeName(p.name))).map((p) => p.name);
  }

  return ordered.slice(0, MAX_PROJECTS_ON_PAGE);
}

export async function tailorResume(
  profile: ResumeProfile,
  resumeText: string,
  job: JobListing
): Promise<TailorResponse> {
  const originalBullets = profile.workExperience
    .flatMap((exp) => exp.bullets.map((bullet) => ({ company: exp.company, title: exp.title, bullet })))
    .slice(0, MAX_BULLETS);

  const username = parseGithubUsername(profile.contact.github);
  const githubRepos = username
    ? filterReposNotOnResume(await fetchPublicRepos(username), profile).slice(0, 5)
    : [];

  const projectNames = profile.projects.map((p) => p.name);

  const userPrompt = `Target listing:
Company: ${job.company}
Title: ${job.position}
Location: ${job.location}

Candidate's target roles: ${profile.targetRoles.join(", ") || "(none extracted)"}
Candidate's skills (reorder/drop from this list only — do not invent):
${JSON.stringify(profile.skills)}

Original resume text (for context only — do not invent facts beyond this + structured fields):
"""
${resumeText.slice(0, 4000)}
"""

Work bullets to lightly rewrite (same order; echo original verbatim; keep similar length):
${JSON.stringify(originalBullets.map((b) => b.bullet))}

Resume projects (use these exact names in projectOrder / removedProjects / tailoredProjects):
${JSON.stringify(
  profile.projects.map((p) => ({
    name: p.name,
    url: p.url,
    bullets: p.bullets,
    technologies: p.technologies,
  }))
)}
Available project names: ${JSON.stringify(projectNames)}

Public GitHub repos NOT already on the resume (select 0–${MAX_GITHUB_ADDS}; prefer 0 if unsure):
${JSON.stringify(
  githubRepos.map((r) => ({
    name: r.name,
    url: r.html_url,
    description: r.description,
    language: r.language,
    topics: r.topics,
    stars: r.stargazers_count,
  }))
)}`;

  const result = await getStructuredJSON({
    schema: TailorResponseSchema,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.3,
    timeoutMs: 25_000,
  });

  const projectOrder = sanitizeProjectOrder(
    profile.projects,
    result.projectOrder,
    result.removedProjects.map((r) => r.name)
  );
  const kept = new Set(projectOrder.map(normalizeName));
  const removedProjects = [
    ...result.removedProjects.filter((r) => profile.projects.some((p) => normalizeName(p.name) === normalizeName(r.name))),
    ...profile.projects
      .filter((p) => !kept.has(normalizeName(p.name)))
      .filter((p) => !result.removedProjects.some((r) => normalizeName(r.name) === normalizeName(p.name)))
      .map((p) => ({ name: p.name, reason: "Dropped to fit one-page / role focus" })),
  ];

  return {
    ...result,
    projectOrder,
    removedProjects,
    tailoredSkills: sanitizeTailoredSkills(profile.skills, result.tailoredSkills),
    tailoredProjects: result.tailoredProjects.filter((p) => kept.has(normalizeName(p.name))),
    addedGithubProjects: result.addedGithubProjects.slice(0, MAX_GITHUB_ADDS).map((p) => ({
      ...p,
      bullets: p.bullets.slice(0, 1),
    })),
  };
}
