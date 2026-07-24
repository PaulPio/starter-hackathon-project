import { GITHUB_TOKEN } from "./config";

export type GithubRepo = {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  pushed_at: string;
};

const MAX_REPOS_FOR_LLM = 8;

/**
 * Accept a bare username, `github.com/user`, or a full profile/repo URL.
 * Returns null when missing or not parseable as a user handle.
 */
export function parseGithubUsername(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;

  value = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  value = value.replace(/^github\.com\//i, "");
  value = value.replace(/\/+$/, "");

  // Drop path after username (e.g. user/repo → user)
  const slash = value.indexOf("/");
  if (slash !== -1) {
    value = value.slice(0, slash);
  }

  // Usernames: alphanumeric / hyphens, 1–39 chars, no leading/trailing hyphen
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(value)) {
    return null;
  }
  return value;
}

/**
 * Fetch public non-fork repos for a user. Returns [] on any failure so tailor
 * can continue without GitHub enrichment.
 */
export async function fetchPublicRepos(username: string): Promise<GithubRepo[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ResumeFit",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=10`,
      { headers, signal: AbortSignal.timeout(8_000) }
    );
    if (!res.ok) return [];

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];

    const repos: GithubRepo[] = [];
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (row.fork === true) continue;
      if (typeof row.name !== "string" || typeof row.html_url !== "string") continue;

      repos.push({
        name: row.name,
        html_url: row.html_url,
        description: typeof row.description === "string" ? row.description : null,
        language: typeof row.language === "string" ? row.language : null,
        topics: Array.isArray(row.topics)
          ? row.topics.filter((t): t is string => typeof t === "string")
          : [],
        stargazers_count: typeof row.stargazers_count === "number" ? row.stargazers_count : 0,
        pushed_at: typeof row.pushed_at === "string" ? row.pushed_at : "",
      });

      if (repos.length >= MAX_REPOS_FOR_LLM) break;
    }
    return repos;
  } catch {
    return [];
  }
}
