import { writeFileSync, unlinkSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { generateResumePdf } from "../lib/resume-pdf";
import { extractResumeText } from "../lib/pdf";

async function main() {
  const bytes = await generateResumePdf({
    name: "Jordan Rivera",
    contact: {
      email: "jordan.rivera@email.com",
      phone: "(555) 123-4567",
      linkedin: null,
      github: "github.com/jrivera",
    },
    tailoredSummary: "This should NOT appear on the PDF at all.",
    skills: ["Python", "Java", "JavaScript", "React", "Node.js", "SQL", "Git", "Flask"],
    education: [
      {
        school: "Florida International University",
        degree: "B.S.",
        field: "Computer Science",
        gradDate: "Expected May 2027",
      },
    ],
    experience: [
      {
        company: "Local Startup Co",
        title: "Software Engineering Intern",
        bullets: [
          "Built a REST API in Python/Flask used by 3 internal tools",
          "Fixed 12 bugs reported in the issue tracker over the summer",
          "Helped onboard 2 new interns by writing setup docs",
        ],
      },
      {
        company: "FIU Intro to Programming",
        title: "Teaching Assistant",
        bullets: [
          "Held weekly office hours for a class of 80 students",
          "Graded assignments in Java and Python",
        ],
      },
    ],
    projects: [
      {
        name: "Campus Event Finder",
        url: null,
        bullets: [
          "Built a web app for students to find and RSVP to campus events",
          "Used by about 40 students in a pilot",
        ],
        technologies: ["React", "Node.js", "PostgreSQL"],
      },
      {
        name: "extra-repo",
        url: "https://github.com/jrivera/extra-repo",
        bullets: ["Public TypeScript utility library"],
        technologies: ["TypeScript"],
      },
    ],
    targetJobLabel: "Tailored for Frontend Software Engineering Intern at Rivian",
  });

  const path = "tmp-onepage.pdf";
  writeFileSync(path, bytes);
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPageCount();
  const text = await extractResumeText(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  );

  console.log("pages", pages);
  console.log("has forbidden summary?", text.includes("This should NOT"));
  console.log("structure ok?", text.includes("EDUCATION") && text.includes("EXPERIENCE") && text.includes("PROJECTS") && text.includes("SKILLS"));
  console.log("---");
  console.log(text);

  unlinkSync(path);
  if (pages !== 1) process.exit(1);
  if (text.includes("This should NOT")) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
