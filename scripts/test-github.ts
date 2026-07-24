// Smoke-check username parsing for tailor-time GitHub fetch. Run: npx tsx scripts/test-github.ts
import { fetchPublicRepos, parseGithubUsername } from "../lib/github";

const cases: Array<[string | null, string | null]> = [
  [null, null],
  ["", null],
  ["jrivera", "jrivera"],
  ["github.com/jrivera", "jrivera"],
  ["https://github.com/jrivera", "jrivera"],
  ["https://www.github.com/jrivera/", "jrivera"],
  ["https://github.com/jrivera/some-repo", "jrivera"],
  ["not a user!", null],
  ["-bad", null],
];

let failed = 0;
for (const [input, expected] of cases) {
  const got = parseGithubUsername(input);
  const ok = got === expected;
  console.log(`${ok ? "OK" : "FAIL"} parseGithubUsername(${JSON.stringify(input)}) => ${JSON.stringify(got)} (want ${JSON.stringify(expected)})`);
  if (!ok) failed += 1;
}

async function main() {
  if (failed > 0) {
    console.error(`\n${failed} case(s) failed`);
    process.exit(1);
  }
  console.log("\nAll parseGithubUsername cases passed.");

  const repos = await fetchPublicRepos("torvalds");
  console.log(`fetchPublicRepos(torvalds): ${repos.length} non-fork repos`);
  if (repos.length === 0) {
    console.warn("WARN: no repos returned (network/rate-limit?) — tailor will degrade to []");
  } else {
    console.log("sample:", repos.slice(0, 2).map((r) => r.name).join(", "));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
