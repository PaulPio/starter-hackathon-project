import { fetchPublicRepos, parseGithubUsername, type GithubRepo } from "./github";
import { getStructuredJSON } from "./llm";
import {
  TailorLlmResponseSchema,
  type JobListing,
  type ResumeProfile,
  type TailorResponse,
} from "./schemas";
import {
  sanitizeGithubProjects,
  sanitizeProjectOrder,
  sanitizeTailoredBullets,
  sanitizeTailoredSkills,
  MAX_WORK_BULLETS,
} from "./tailor-sanitize";

export {
  assembleProjectBullets,
  mergeProjectsForPdf,
  sanitizeGithubProjects,
  sanitizeProjectOrder,
  sanitizeTailoredBullets,
  sanitizeTailoredSkills,
  MAX_WORK_BULLETS,
} from "./tailor-sanitize";

/** Up to this many GitHub repos may replace resume projects on the one-page PDF. */
const MAX_GITHUB_REPLACEMENTS = 3;
const MAX_PROJECTS_ON_PAGE = 3;

// TODO(data-pipeline): JobListing has no `description` field. SpeedyApply README tables only
// expose company/position/location/salary/link — full JD text was never scraped or stored.
// When a description becomes available, include it in the user prompt (~3000 chars) and allow
// keyword surfacing from that JD when the skill is already evidenced on the resume.

const SYSTEM_PROMPT = `You are helping a job seeker lightly tailor a ONE-PAGE resume toward one internship listing.

Important limitation: the job data source only provides title, company, and location — not a full
job description body. Tailor toward what that title/company/location signals about the role, and
do not invent specific requirements the listing didn't state.

Faithfulness rules (strict — the downloaded PDF must stay similar to the base resume):
- Prefer SMALL edits: swap a verb, surface an existing keyword, tighten phrasing. Do NOT expand
  bullets. Each tailored bullet must be roughly the SAME LENGTH as its original (within ~20%).
- Preserve the meaning of every original work and project bullet. Never add employers, metrics,
  tools, or achievements that are not evidenced in the original bullet or resume text.
- Return originalIndex — the 0-based position of the bullet in the array you were given —
  instead of repeating its text. Do the same for bullets inside each tailoredProjects entry
  (originalIndex is relative to that project's bullets array).
- The professional summary is for the UI preview only (exactly 2 short sentences from facts already
  in the resume). It will NOT appear on the PDF.

Style rules for every rewritten bullet:
- Start with a strong, specific action verb in active voice. Never passive voice
  (no "was responsible for," "was integrated by").
- Do not reuse the same leading verb twice in your response — vary verbs across bullets
  (e.g. Engineered, Automated, Launched, Architected, Developed, Constructed, Devised,
  Programmed). Avoid generic filler verbs like "Built" or "Worked on."
- When a bullet already contains a real number being rounded down, prefer "over X"
  phrasing rather than "approximately X" or "around X."
- Never use an em dash ( — ) to join clauses within a bullet; use a period or comma instead.
- Never introduce a metric, user count, percentage, or outcome that isn't already present
  in the original bullet or resume text — tightening phrasing is fine, inventing numbers
  is not, even if it would make the bullet stronger.

Projects — reorder, drop, and REPLACE with GitHub when it helps the job fit:
- Return "projectOrder": the names of resume projects to KEEP, most relevant first (exact names
  from the resume projects list). Omit a project to delete it from the tailored PDF when it is
  weak for this listing OR when a GitHub repo is a better fit (make room for replacements).
  Keep at most ${MAX_PROJECTS_ON_PAGE} projects on the final page (resume + GitHub combined).
- For every KEPT resume project, include a tailoredProjects entry (same name; lightly rewritten
  bullets with originalIndex). Prefer rewriting at least 2 bullets per project when the original
  has 2+.
- For every DROPPED resume project, include a removedProjects entry with name + short reason
  (e.g. "Replaced by stronger GitHub project for this role").

GitHub project replacement (when public repos are provided):
- Prefer REPLACING weaker or less-relevant resume projects with better-fitting public GitHub
  repos for this listing's title/company/location — do not only append on top.
- Select 1–${MAX_GITHUB_REPLACEMENTS} repos from the provided list that are NOT already on the
  resume and clearly match the role signal. Put the strongest fits first in addedGithubProjects.
- For each selected repo: write exactly 2 short bullets grounded ONLY in that repo's description,
  language, and topics — no fabricated metrics or tools.
- If no repos are provided, or none fit, return an empty addedGithubProjects array and keep the
  best resume projects instead.
- One-page budget: kept resume projects + GitHub replacements must total at most
  ${MAX_PROJECTS_ON_PAGE}. Drop resume projects to make room when GitHub replacements are stronger.

Skills — reorder / drop only (never invent):
- Return "tailoredSkills": a reordered subset of the candidate's EXISTING skills, putting the most
  relevant to this listing first. You may drop skills that are clearly irrelevant for this role
  to save space. Do NOT add skills that are not already in the candidate's skills list.
- Include a short "skillsReason" (max ~15 words) explaining the reorder/drops.

For each rewritten bullet and each GitHub project, include a short "reason" (max ~10 words).`;

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function filterReposNotOnResume(repos: GithubRepo[], profile: ResumeProfile): GithubRepo[] {
  const existing = new Set(profile.projects.map((p) => normalizeName(p.name)));
  return repos.filter((r) => !existing.has(normalizeName(r.name)));
}

export async function tailorResume(
  profile: ResumeProfile,
  resumeText: string,
  job: JobListing
): Promise<TailorResponse> {
  const originalBullets = profile.workExperience
    .flatMap((exp) => exp.bullets.map((bullet) => ({ company: exp.company, title: exp.title, bullet })))
    .slice(0, MAX_WORK_BULLETS);

  const workBulletTexts = originalBullets.map((b) => b.bullet);

  const username = parseGithubUsername(profile.contact.github);
  const githubRepos = username
    ? filterReposNotOnResume(await fetchPublicRepos(username), profile)
    : [];

  const projectNames = profile.projects.map((p) => p.name);

  // TODO(data-pipeline): When JobListing gains a `description` field from a richer job source,
  // append it here under "Target listing full description:" (truncate to ~3000 chars) and update
  // SYSTEM_PROMPT to allow keyword surfacing from that JD when already evidenced on the resume.
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

Work bullets to lightly rewrite (return originalIndex 0..${Math.max(0, workBulletTexts.length - 1)}; keep similar length):
${JSON.stringify(workBulletTexts.map((bullet, originalIndex) => ({ originalIndex, bullet })))}

Resume projects (use these exact names in projectOrder / removedProjects / tailoredProjects;
for each kept project's bullets return originalIndex relative to that project's bullets array).
Drop weaker ones when a GitHub repo is a better fit for this listing:
${JSON.stringify(
  profile.projects.map((p) => ({
    name: p.name,
    url: p.url,
    bullets: p.bullets.map((bullet, originalIndex) => ({ originalIndex, bullet })),
    technologies: p.technologies,
  }))
)}
Available resume project names: ${JSON.stringify(projectNames)}

Public GitHub repos NOT already on the resume (prefer 1–${MAX_GITHUB_REPLACEMENTS} replacements
that best match this listing; drop resume projects to make room; empty only if none fit):
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
    schema: TailorLlmResponseSchema,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.3,
    timeoutMs: 25_000,
  });

  const addedGithubProjects = sanitizeGithubProjects(
    result.addedGithubProjects,
    githubRepos,
    MAX_GITHUB_REPLACEMENTS
  );

  // Leave room on the page for GitHub replacements.
  const resumeSlots = Math.max(0, MAX_PROJECTS_ON_PAGE - addedGithubProjects.length);

  const projectOrder = sanitizeProjectOrder(
    profile.projects,
    result.projectOrder,
    result.removedProjects.map((r) => r.name),
    resumeSlots
  );
  const kept = new Set(projectOrder.map(normalizeName));
  const removedProjects = [
    ...result.removedProjects.filter((r) =>
      profile.projects.some((p) => normalizeName(p.name) === normalizeName(r.name))
    ),
    ...profile.projects
      .filter((p) => !kept.has(normalizeName(p.name)))
      .filter((p) => !result.removedProjects.some((r) => normalizeName(r.name) === normalizeName(p.name)))
      .map((p) => ({
        name: p.name,
        reason:
          addedGithubProjects.length > 0
            ? "Replaced for stronger GitHub project fit"
            : "Dropped to fit one-page / role focus",
      })),
  ];

  const projectsByName = new Map(profile.projects.map((p) => [normalizeName(p.name), p] as const));

  const tailoredProjects = result.tailoredProjects
    .filter((p) => kept.has(normalizeName(p.name)))
    .map((p) => {
      const source = projectsByName.get(normalizeName(p.name));
      const originals = source?.bullets ?? [];
      return {
        name: source?.name ?? p.name,
        url: p.url,
        bullets: sanitizeTailoredBullets(originals, p.bullets),
      };
    });

  return {
    tailoredSummary: result.tailoredSummary,
    tailoredBullets: sanitizeTailoredBullets(workBulletTexts, result.tailoredBullets),
    tailoredProjects,
    projectOrder,
    removedProjects,
    tailoredSkills: sanitizeTailoredSkills(profile.skills, result.tailoredSkills),
    skillsReason: result.skillsReason,
    addedGithubProjects,
  };
}
