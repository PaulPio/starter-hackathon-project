// One-off / periodic script: fetch the live speedyapply README, parse it, and
// commit the result as data/jobs-snapshot.json so the deployed app's demo
// path never depends on GitHub being reachable live.
// Run with: npm run build:jobs-snapshot
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { JOBS_SOURCE_URL } from "../lib/config";
import { parseJobsMarkdown } from "../lib/jobs-source";

async function main() {
  const res = await fetch(JOBS_SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${JOBS_SOURCE_URL}: ${res.status}`);
  }
  const markdown = await res.text();
  const jobs = parseJobsMarkdown(markdown);

  if (jobs.length === 0) {
    throw new Error("Parsed 0 jobs — refusing to overwrite the snapshot. Check the parser against the current README format.");
  }

  const outPath = path.join(process.cwd(), "data", "jobs-snapshot.json");
  await writeFile(outPath, JSON.stringify(jobs, null, 2));
  console.log(`Wrote ${jobs.length} jobs to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
