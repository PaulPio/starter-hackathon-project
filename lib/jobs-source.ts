import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { JOBS_SOURCE_URL } from "./config";
import {
  extractHref,
  parseMarkdownTables,
  stripTags,
  type RawJobRow,
} from "./markdown-table-parser";
import type { JobListing } from "./schemas";

function hashId(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 12);
}

function toJobListing(row: RawJobRow): JobListing | null {
  const linkCell = row.cells["posting"] ?? "";
  const link = extractHref(linkCell);
  if (!link) return null; // no real application URL — not worth showing

  const company = stripTags(row.cells["company"] ?? "");
  const position = stripTags(row.cells["position"] ?? "");
  if (!company || !position) return null;

  const location = stripTags(row.cells["location"] ?? "");
  const rawSalary = row.cells["salary"];
  const salary = rawSalary ? stripTags(rawSalary) || null : null;
  const age = stripTags(row.cells["age"] ?? "");

  return {
    id: hashId(`${company}|${position}|${link}`),
    company,
    position,
    location,
    salary,
    link,
    age,
    category: row.category || row.section,
  };
}

export function parseJobsMarkdown(markdown: string): JobListing[] {
  return parseMarkdownTables(markdown)
    .map(toJobListing)
    .filter((job): job is JobListing => job !== null);
}

const SNAPSHOT_PATH = path.join(process.cwd(), "data", "jobs-snapshot.json");

async function readSnapshot(): Promise<JobListing[]> {
  const raw = await readFile(SNAPSHOT_PATH, "utf8");
  return JSON.parse(raw) as JobListing[];
}

// Demo reliability > freshness: try a live (cached) fetch, but never let a
// network hiccup, rate limit, or upstream format change blank the job list —
// fall back to the committed snapshot, and never let an empty live parse
// overwrite a working snapshot result.
export async function getJobs(): Promise<{ jobs: JobListing[]; source: "live" | "snapshot" }> {
  try {
    const res = await fetch(JOBS_SOURCE_URL, { next: { revalidate: 3600 } });
    if (res.ok) {
      const markdown = await res.text();
      const jobs = parseJobsMarkdown(markdown);
      if (jobs.length > 0) return { jobs, source: "live" };
    }
  } catch {
    // fall through to snapshot
  }

  try {
    const jobs = await readSnapshot();
    return { jobs, source: "snapshot" };
  } catch {
    return { jobs: [], source: "snapshot" };
  }
}
