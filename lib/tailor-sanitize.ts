/** Pure sanitizers for tailor LLM output — kept free of OpenRouter imports for easy unit tests. */

/** Must match the slice used when sending work bullets to the LLM in tailorResume. */
export const MAX_WORK_BULLETS = 6;

export function sanitizeTailoredBullets(
  originalBullets: string[],
  proposed: { originalIndex: number; tailored: string; reason?: string }[]
): { originalIndex: number; original: string; tailored: string; reason: string }[] {
  const out: { originalIndex: number; original: string; tailored: string; reason: string }[] = [];
  const seen = new Set<number>();
  for (const b of proposed) {
    if (
      typeof b.originalIndex !== "number" ||
      !Number.isInteger(b.originalIndex) ||
      b.originalIndex < 0 ||
      b.originalIndex >= originalBullets.length ||
      seen.has(b.originalIndex)
    ) {
      continue;
    }
    seen.add(b.originalIndex);
    out.push({
      originalIndex: b.originalIndex,
      original: originalBullets[b.originalIndex],
      tailored: b.tailored,
      reason: b.reason ?? "",
    });
  }
  return out;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function resolveSkill(candidate: string, allowed: string[]): string | null {
  const needle = candidate.trim().toLowerCase();
  if (!needle) return null;
  const exact = allowed.find((s) => s.trim().toLowerCase() === needle);
  if (exact) return exact;
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
  removedNames: string[],
  maxProjects = 3
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
    return profileProjects.filter((p) => !removed.has(normalizeName(p.name))).map((p) => p.name);
  }

  return ordered.slice(0, maxProjects);
}

/**
 * Build the final bullet list for a project: prefer tailored text by originalIndex,
 * fill remaining slots from originals so we hit MIN when the resume supports it.
 */
export function assembleProjectBullets(
  originals: string[],
  tailored: { originalIndex: number; tailored: string }[],
  maxBullets = 2,
  minBullets = 2
): string[] {
  const byIndex = new Map<number, string>();
  for (const b of tailored) {
    if (b.originalIndex >= 0 && b.originalIndex < originals.length && !byIndex.has(b.originalIndex)) {
      byIndex.set(b.originalIndex, b.tailored);
    }
  }

  const out: string[] = [];
  const used = new Set<number>();

  // Prefer tailored indices in ascending order first.
  const tailoredOrder = [...byIndex.keys()].sort((a, b) => a - b);
  for (const i of tailoredOrder) {
    if (out.length >= maxBullets) break;
    out.push(byIndex.get(i)!);
    used.add(i);
  }

  // Top up from original bullets (including untailored) until min/max.
  const target = Math.min(maxBullets, Math.max(minBullets, out.length), originals.length);
  for (let i = 0; i < originals.length && out.length < target; i++) {
    if (used.has(i)) continue;
    out.push(originals[i]);
    used.add(i);
  }

  // If still under max and originals remain (min already met), fill to max.
  for (let i = 0; i < originals.length && out.length < maxBullets; i++) {
    if (used.has(i)) continue;
    out.push(originals[i]);
    used.add(i);
  }

  return out;
}

export type GithubProjectCandidate = {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  topics: string[];
};

export type GithubProjectProposal = {
  name: string;
  url: string;
  bullets: string[];
  technologies: string[];
  reason: string;
};

/**
 * Keep only real public repos from the fetch list; cap count; ensure up to 2 bullets.
 * Invented repo names are dropped.
 */
export function sanitizeGithubProjects(
  proposed: GithubProjectProposal[],
  availableRepos: GithubProjectCandidate[],
  maxProjects: number
): GithubProjectProposal[] {
  const byNorm = new Map(availableRepos.map((r) => [normalizeName(r.name), r] as const));
  const out: GithubProjectProposal[] = [];
  const seen = new Set<string>();

  for (const p of proposed) {
    if (out.length >= maxProjects) break;
    const repo = byNorm.get(normalizeName(p.name));
    if (!repo) continue;
    const key = normalizeName(repo.name);
    if (seen.has(key)) continue;
    seen.add(key);

    const technologies =
      p.technologies.length > 0
        ? p.technologies.slice(0, 4)
        : [repo.language, ...repo.topics].filter((t): t is string => Boolean(t)).slice(0, 4);

    const bullets = p.bullets.map((b) => b.trim()).filter(Boolean).slice(0, 2);
    if (bullets.length === 0 && repo.description) {
      bullets.push(repo.description.slice(0, 160));
    }
    if (bullets.length === 0) continue;

    out.push({
      name: repo.name,
      url: repo.html_url,
      bullets,
      technologies,
      reason: p.reason || "Replaced for stronger job fit from GitHub",
    });
  }

  return out;
}

/**
 * Final one-page project list: GitHub replacements lead (intentional swaps for the job),
 * then remaining resume projects fill leftover slots — total capped at maxProjects.
 */
export function mergeProjectsForPdf<TResume, TGithub>(
  resumeProjects: TResume[],
  githubProjects: TGithub[],
  maxProjects: number
): Array<{ source: "github"; project: TGithub } | { source: "resume"; project: TResume }> {
  const githubSlots = Math.min(githubProjects.length, maxProjects);
  const resumeSlots = Math.max(0, maxProjects - githubSlots);
  const out: Array<{ source: "github"; project: TGithub } | { source: "resume"; project: TResume }> =
    [];
  for (const project of githubProjects.slice(0, githubSlots)) {
    out.push({ source: "github", project });
  }
  for (const project of resumeProjects.slice(0, resumeSlots)) {
    out.push({ source: "resume", project });
  }
  return out;
}
