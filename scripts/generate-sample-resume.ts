// Generates data/sample-resume.pdf — the bundled "Try with sample resume" demo
// asset. Run with: npx tsx scripts/generate-sample-resume.ts
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const LINES: { text: string; size: number; bold?: boolean; gapBefore?: number }[] = [
  { text: "Jordan Rivera", size: 16, bold: true },
  { text: "jordan.rivera@email.com | (555) 123-4567 | github.com/jrivera", size: 9 },

  { text: "EDUCATION", size: 11, bold: true, gapBefore: 16 },
  { text: "Florida International University — B.S. Computer Science, Expected May 2027", size: 10 },
  { text: "GPA: 3.6/4.0", size: 10 },

  { text: "EXPERIENCE", size: 11, bold: true, gapBefore: 16 },
  { text: "Software Engineering Intern, Local Startup Co — Miami, FL (Summer 2025)", size: 10, bold: true },
  { text: "- Built a REST API in Python/Flask used by 3 internal tools", size: 10 },
  { text: "- Fixed 12 bugs reported in the issue tracker over the summer", size: 10 },
  { text: "- Helped onboard 2 new interns by writing setup docs", size: 10 },
  { text: "Teaching Assistant, FIU Intro to Programming — Miami, FL (Fall 2025)", size: 10, bold: true, gapBefore: 8 },
  { text: "- Held weekly office hours for a class of 80 students", size: 10 },
  { text: "- Graded assignments in Java and Python", size: 10 },

  { text: "PROJECTS", size: 11, bold: true, gapBefore: 16 },
  { text: "Campus Event Finder (React, Node.js, PostgreSQL)", size: 10, bold: true },
  { text: "- Built a web app for students to find and RSVP to campus events", size: 10 },
  { text: "- Used by about 40 students in a pilot", size: 10 },

  { text: "SKILLS", size: 11, bold: true, gapBefore: 16 },
  { text: "Python, Java, JavaScript, React, Node.js, SQL, Git, Flask", size: 10 },
];

async function main() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 740;
  const x = 56;
  for (const line of LINES) {
    y -= (line.gapBefore ?? 14);
    page.drawText(line.text, {
      x,
      y,
      size: line.size,
      font: line.bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
  }

  const bytes = await doc.save();
  const outPath = path.join(process.cwd(), "data", "sample-resume.pdf");
  await writeFile(outPath, bytes);
  console.log(`Wrote ${outPath} (${bytes.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
