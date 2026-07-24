// Throwaway smoke test for the structured-output pipeline. Not part of the app.
import { parseResumeProfile } from "../lib/resume";
import { rankJobs } from "../lib/rank";
import { tailorResume } from "../lib/tailor";
import type { JobListing } from "../lib/schemas";

const SAMPLE_RESUME = `
Jordan Rivera
jordan.rivera@email.com | (555) 123-4567 | github.com/jrivera

EDUCATION
Florida International University — B.S. Computer Science, Expected May 2027
GPA: 3.6/4.0

EXPERIENCE
Software Engineering Intern, Local Startup Co — Miami, FL (Summer 2025)
- Built a REST API in Python/Flask used by 3 internal tools
- Fixed 12 bugs reported in the issue tracker over the summer
- Helped onboard 2 new interns by writing setup docs

Teaching Assistant, FIU Intro to Programming — Miami, FL (Fall 2025)
- Held weekly office hours for a class of 80 students
- Graded assignments in Java and Python

PROJECTS
Campus Event Finder (React, Node.js, PostgreSQL)
- Built a web app for students to find and RSVP to campus events
- Used by about 40 students in a pilot

SKILLS
Python, Java, JavaScript, React, Node.js, SQL, Git, Flask
`;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("=== parseResumeProfile ===");
  const pStart = Date.now();
  const profile = await parseResumeProfile(SAMPLE_RESUME);
  console.log(`parse: ${Date.now() - pStart}ms, skills=${profile.skills.length}, healthScore=${profile.healthCheck.overallScore}, targetRoles=${JSON.stringify(profile.targetRoles)}`);
  console.log(JSON.stringify(profile, null, 2));
  await sleep(2000);

  const sampleJobs: JobListing[] = [
    { id: "1", company: "Google", position: "Software Engineering Intern - BS - Summer 2027", location: "Mountain View, CA", salary: "$72/hr", link: "https://example.com/1", age: "3d", category: "FAANG+" },
    { id: "2", company: "Rivian", position: "Frontend Software Engineering Intern", location: "Irvine, CA", salary: "$51/hr", link: "https://example.com/2", age: "50d", category: "FAANG+" },
    { id: "3", company: "Citadel", position: "Quant Trading Intern", location: "Chicago, IL", salary: "$125/hr", link: "https://example.com/3", age: "9d", category: "Quant" },
    { id: "4", company: "Local Robotics Co", position: "Embedded Systems Intern", location: "Austin, TX", salary: null, link: "https://example.com/4", age: "20d", category: "Other" },
  ];

  console.log("\n=== rankJobs ===");
  const rankStart = Date.now();
  const ranked = await rankJobs(profile, sampleJobs);
  console.log(`rankJobs: ${Date.now() - rankStart}ms`);
  console.log(JSON.stringify(ranked, null, 2));
  await sleep(2000);

  console.log("\n=== tailorResume ===");
  const tailorStart = Date.now();
  const tailored = await tailorResume(profile, SAMPLE_RESUME, sampleJobs[1]);
  console.log(`tailorResume: ${Date.now() - tailorStart}ms`);
  console.log(JSON.stringify(tailored, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
