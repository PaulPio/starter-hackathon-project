// Run: npx tsx scripts/test-tailor-sanitize.ts
import {
  assembleProjectBullets,
  mergeProjectsForPdf,
  sanitizeGithubProjects,
  sanitizeTailoredBullets,
} from "../lib/tailor-sanitize";

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL ${msg}`);
    failed += 1;
  } else {
    console.log(`OK   ${msg}`);
  }
}

const originals = [
  "Built a REST API in Python/Flask used by 3 internal tools",
  "Fixed 12 bugs reported in the issue tracker over the summer",
  "Helped onboard 2 new interns by writing setup docs",
];

const proposed = [
  {
    originalIndex: 0,
    tailored: "Engineered a REST API in Python/Flask used by 3 internal tools",
    reason: "stronger verb",
  },
  {
    originalIndex: 1,
    tailored: "Resolved over 12 bugs reported in the issue tracker over the summer",
    reason: "over phrasing",
  },
];

const sanitized = sanitizeTailoredBullets(originals, proposed);
assert(sanitized.length === 2, "keeps two valid index hits");
assert(sanitized[0].original === originals[0], "maps index 0 to real original text");
assert(sanitized[1].original === originals[1], "maps index 1 to real original text");
assert(
  sanitized[0].tailored.startsWith("Engineered"),
  "preserves tailored text even if model would have drifted on original echo"
);

const withDupAndOob = sanitizeTailoredBullets(originals, [
  { originalIndex: 0, tailored: "A", reason: "a" },
  { originalIndex: 0, tailored: "dup", reason: "dup" },
  { originalIndex: 99, tailored: "oob", reason: "oob" },
  { originalIndex: -1, tailored: "neg", reason: "neg" },
  { originalIndex: 2, tailored: "C", reason: "c" },
]);
assert(withDupAndOob.length === 2, "dedupes and drops out-of-range indices");
assert(
  withDupAndOob[0].originalIndex === 0 && withDupAndOob[1].originalIndex === 2,
  "keeps first 0 then 2"
);

const assembled = assembleProjectBullets(
  originals,
  [{ originalIndex: 0, tailored: "Engineered a REST API in Python/Flask used by 3 internal tools" }],
  2,
  2
);
assert(assembled.length === 2, "tops up to 2 bullets when originals support it");
assert(assembled[0].startsWith("Engineered"), "first bullet is tailored");
assert(assembled[1] === originals[1], "second bullet pulled from untailored original");

const singleOriginal = assembleProjectBullets(
  ["Only one"],
  [{ originalIndex: 0, tailored: "Only one, reframed" }],
  2,
  2
);
assert(singleOriginal.length === 1, "cannot invent a second bullet if original has only one");

const repos = [
  {
    name: "event-finder",
    html_url: "https://github.com/u/event-finder",
    description: "Campus event RSVP app",
    language: "TypeScript",
    topics: ["react"],
  },
  {
    name: "ml-notes",
    html_url: "https://github.com/u/ml-notes",
    description: "Course notes",
    language: "Python",
    topics: [],
  },
];

const gh = sanitizeGithubProjects(
  [
    {
      name: "event-finder",
      url: "https://evil.example/fake",
      bullets: ["Shipped RSVP flows in React", "Stored events in Postgres"],
      technologies: ["React"],
      reason: "Frontend fit",
    },
    {
      name: "invented-repo",
      url: "https://github.com/u/nope",
      bullets: ["Fake"],
      technologies: [],
      reason: "should drop",
    },
    {
      name: "ml-notes",
      url: "x",
      bullets: ["Documented ML labs"],
      technologies: [],
      reason: "secondary",
    },
  ],
  repos,
  3
);
assert(gh.length === 2, "keeps only real GitHub repos");
assert(gh[0].name === "event-finder" && gh[0].url.includes("github.com"), "uses canonical repo URL");
assert(
  gh.every((p) => p.name !== "invented-repo"),
  "drops invented repo names"
);

const merged = mergeProjectsForPdf(
  [{ name: "Old Blog" }, { name: "School Site" }],
  [{ name: "event-finder" }, { name: "ml-notes" }],
  3
);
assert(merged.length === 3, "caps total projects at 3");
assert(merged[0].source === "github" && merged[1].source === "github", "GitHub replacements lead");
assert(merged[2].source === "resume", "resume fills leftover slot");

const fullReplace = mergeProjectsForPdf(
  [{ name: "A" }],
  [{ name: "g1" }, { name: "g2" }, { name: "g3" }],
  3
);
assert(
  fullReplace.length === 3 && fullReplace.every((s) => s.source === "github"),
  "can fully replace with GitHub"
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll tailor-sanitize tests passed.");
