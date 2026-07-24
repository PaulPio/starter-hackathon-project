import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, type Color } from "pdf-lib";
import type { ResumePdfData } from "./schemas";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 56;
const MARGIN_TOP = 52;
const MARGIN_BOTTOM = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.4, 0.4, 0.4);

const BULLET_INDENT = 14;

// StandardFonts only support WinAnsi encoding — LLM output and extracted resume
// text can contain characters (smart quotes, em/en dashes) that throw at draw
// time otherwise.
export function sanitizeForPdf(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x00-\xFF•]/g, "");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = word;
      if (font.widthOfTextAtSize(current, size) > maxWidth) {
        lines.push(...breakLongWord(current, font, size, maxWidth));
        current = "";
      }
    } else {
      lines.push(...breakLongWord(word, font, size, maxWidth));
      current = "";
    }
  }
  if (current) lines.push(current);
  return lines;
}

function breakLongWord(word: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  let chunk = "";
  for (const ch of word) {
    const candidate = chunk + ch;
    if (chunk === "" || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      chunk = candidate;
    } else {
      out.push(chunk);
      chunk = ch;
    }
  }
  if (chunk) out.push(chunk);
  return out;
}

/** Single-page layout: never creates a second page; further draws become no-ops when full. */
class ResumeLayout {
  private doc: PDFDocument;
  private page: PDFPage;
  private y: number;
  clipped = false;

  constructor(doc: PDFDocument) {
    this.doc = doc;
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  get pageCount(): number {
    return this.doc.getPageCount();
  }

  private canFit(lineHeight: number): boolean {
    return this.y - lineHeight >= MARGIN_BOTTOM;
  }

  addGap(px: number) {
    if (this.clipped) return;
    if (this.y - px < MARGIN_BOTTOM) {
      this.clipped = true;
      return;
    }
    this.y -= px;
  }

  drawLine(text: string, opts: { x?: number; size: number; font: PDFFont; color?: Color; lineHeight?: number }) {
    if (this.clipped) return;
    const lineHeight = opts.lineHeight ?? opts.size * 1.2;
    if (!this.canFit(lineHeight)) {
      this.clipped = true;
      return;
    }
    this.page.drawText(sanitizeForPdf(text), {
      x: opts.x ?? MARGIN_X,
      y: this.y - opts.size,
      size: opts.size,
      font: opts.font,
      color: opts.color ?? INK,
    });
    this.y -= lineHeight;
  }

  drawWrapped(
    text: string,
    opts: { x?: number; maxWidth?: number; size: number; font: PDFFont; color?: Color; lineHeight?: number }
  ) {
    if (this.clipped) return;
    const x = opts.x ?? MARGIN_X;
    const maxWidth = opts.maxWidth ?? CONTENT_WIDTH;
    const lines = wrapText(sanitizeForPdf(text), opts.font, opts.size, maxWidth);
    for (const line of lines) {
      this.drawLine(line, {
        x,
        size: opts.size,
        font: opts.font,
        color: opts.color,
        lineHeight: opts.lineHeight,
      });
      if (this.clipped) return;
    }
  }

  drawBulletLines(text: string, opts: { size: number; font: PDFFont; lineHeight?: number }) {
    if (this.clipped) return;
    const markerX = MARGIN_X;
    const textX = MARGIN_X + BULLET_INDENT;
    const maxWidth = CONTENT_WIDTH - BULLET_INDENT;
    const lh = opts.lineHeight ?? opts.size * 1.2;
    const lines = wrapText(sanitizeForPdf(text), opts.font, opts.size, maxWidth);

    for (let i = 0; i < lines.length; i++) {
      if (!this.canFit(lh)) {
        this.clipped = true;
        return;
      }
      if (i === 0) {
        this.page.drawText("•", {
          x: markerX,
          y: this.y - opts.size,
          size: opts.size,
          font: opts.font,
          color: INK,
        });
      }
      this.page.drawText(lines[i], {
        x: textX,
        y: this.y - opts.size,
        size: opts.size,
        font: opts.font,
        color: INK,
      });
      this.y -= lh;
    }
  }
}

interface Fonts {
  font: PDFFont;
  fontBold: PDFFont;
  fontItalic: PDFFont;
}

type Density = "normal" | "tight";

function densityGaps(d: Density) {
  return d === "tight"
    ? { afterHeader: 8, section: 10, afterHeading: 4, afterRole: 5, afterBullet: 1, afterEdu: 2 }
    : { afterHeader: 12, section: 14, afterHeading: 6, afterRole: 8, afterBullet: 2, afterEdu: 3 };
}

function drawHeader(layout: ResumeLayout, data: ResumePdfData, fonts: Fonts, density: Density) {
  const gaps = densityGaps(density);
  layout.drawLine(data.name ?? "Resume", { size: 16, font: fonts.fontBold, lineHeight: 18 });
  layout.addGap(2);

  const contactParts = [data.contact.email, data.contact.phone, data.contact.linkedin, data.contact.github].filter(
    (v): v is string => Boolean(v)
  );
  if (contactParts.length > 0) {
    layout.drawWrapped(contactParts.join(" | "), { size: 9, font: fonts.font, color: MUTED, lineHeight: 11 });
  }

  if (data.targetJobLabel.trim()) {
    layout.addGap(2);
    layout.drawWrapped(data.targetJobLabel, { size: 8.5, font: fonts.fontItalic, color: MUTED, lineHeight: 11 });
  }
  layout.addGap(gaps.afterHeader);
}

function drawSectionHeading(layout: ResumeLayout, label: string, fonts: Fonts, density: Density) {
  const gaps = densityGaps(density);
  layout.addGap(gaps.section);
  layout.drawLine(label, { size: 11, font: fonts.fontBold, lineHeight: 13 });
  layout.addGap(gaps.afterHeading);
}

function drawEducation(layout: ResumeLayout, data: ResumePdfData, fonts: Fonts, density: Density) {
  if (data.education.length === 0) return;
  const gaps = densityGaps(density);
  drawSectionHeading(layout, "EDUCATION", fonts, density);
  for (const edu of data.education) {
    const parts = [edu.school];
    if (edu.degree) parts.push(edu.degree);
    if (edu.field) parts.push(edu.field);
    let line = parts.join(" — ");
    if (edu.gradDate) line += `, ${edu.gradDate}`;
    layout.drawWrapped(line, { size: 10, font: fonts.font, lineHeight: 12 });
    layout.addGap(gaps.afterEdu);
  }
}

function drawExperience(layout: ResumeLayout, data: ResumePdfData, fonts: Fonts, density: Density) {
  if (data.experience.length === 0) return;
  const gaps = densityGaps(density);
  drawSectionHeading(layout, "EXPERIENCE", fonts, density);
  for (const exp of data.experience) {
    layout.drawWrapped(`${exp.title}, ${exp.company}`, {
      size: 10,
      font: fonts.fontBold,
      lineHeight: 12,
    });
    layout.addGap(2);
    for (const bullet of exp.bullets) {
      layout.drawBulletLines(bullet, { size: 10, font: fonts.font, lineHeight: 12 });
      layout.addGap(gaps.afterBullet);
    }
    layout.addGap(gaps.afterRole);
  }
}

function drawProjects(layout: ResumeLayout, data: ResumePdfData, fonts: Fonts, density: Density) {
  if (data.projects.length === 0) return;
  const gaps = densityGaps(density);
  drawSectionHeading(layout, "PROJECTS", fonts, density);
  for (const project of data.projects) {
    const title =
      project.technologies.length > 0
        ? `${project.name} (${project.technologies.join(", ")})`
        : project.name;
    layout.drawWrapped(title, { size: 10, font: fonts.fontBold, lineHeight: 12 });
    layout.addGap(2);
    // Skip long GitHub URLs on the PDF — they blow the one-page budget and
    // aren't on typical base resumes; contact already has the GitHub handle.
    for (const bullet of project.bullets) {
      layout.drawBulletLines(bullet, { size: 10, font: fonts.font, lineHeight: 12 });
      layout.addGap(gaps.afterBullet);
    }
    layout.addGap(gaps.afterRole);
  }
}

function drawSkills(layout: ResumeLayout, data: ResumePdfData, fonts: Fonts, density: Density) {
  if (data.skills.length === 0) return;
  drawSectionHeading(layout, "SKILLS", fonts, density);
  // Comma-separated like the sample resume — denser than bullet separators.
  layout.drawWrapped(data.skills.join(", "), { size: 10, font: fonts.font, lineHeight: 12 });
}

function trimForOnePage(data: ResumePdfData): ResumePdfData {
  return {
    ...data,
    // AI summary is for the diff preview, not the base-like PDF.
    tailoredSummary: "",
    experience: data.experience.map((exp) => ({
      ...exp,
      bullets: exp.bullets.slice(0, 4),
    })),
    projects: data.projects.slice(0, 3).map((p) => ({
      ...p,
      url: null,
      bullets: p.bullets.slice(0, 2),
      technologies: p.technologies.slice(0, 4),
    })),
  };
}

function drawAll(layout: ResumeLayout, data: ResumePdfData, fonts: Fonts, density: Density) {
  drawHeader(layout, data, fonts, density);
  // Intentionally no summary block — keeps the PDF structured like the uploaded resume.
  drawEducation(layout, data, fonts, density);
  drawExperience(layout, data, fonts, density);
  drawProjects(layout, data, fonts, density);
  drawSkills(layout, data, fonts, density);
}

export async function generateResumePdf(data: ResumePdfData): Promise<Uint8Array> {
  const base = trimForOnePage(data);

  // Pass 1: normal density with full (capped) content.
  // Pass 2: tight density.
  // Pass 3: drop optional extras (keep only first 2 projects).
  const attempts: ResumePdfData[] = [
    base,
    { ...base, projects: base.projects.slice(0, 2) },
    {
      ...base,
      experience: base.experience.map((e) => ({ ...e, bullets: e.bullets.slice(0, 3) })),
      projects: base.projects.slice(0, 2).map((p) => ({ ...p, bullets: p.bullets.slice(0, 2) })),
    },
  ];

  for (const density of ["normal", "tight"] as const) {
    for (const attempt of attempts) {
      const doc = await PDFDocument.create();
      const fonts: Fonts = {
        font: await doc.embedFont(StandardFonts.Helvetica),
        fontBold: await doc.embedFont(StandardFonts.HelveticaBold),
        fontItalic: await doc.embedFont(StandardFonts.HelveticaOblique),
      };
      const layout = new ResumeLayout(doc);
      drawAll(layout, attempt, fonts, density);
      if (!layout.clipped && layout.pageCount === 1) {
        return doc.save();
      }
    }
  }

  // Last resort: tight + minimal content — still exactly one page (clipped draws stop).
  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    font: await doc.embedFont(StandardFonts.Helvetica),
    fontBold: await doc.embedFont(StandardFonts.HelveticaBold),
    fontItalic: await doc.embedFont(StandardFonts.HelveticaOblique),
  };
  const layout = new ResumeLayout(doc);
  drawAll(
    layout,
    {
      ...base,
      experience: base.experience.slice(0, 2).map((e) => ({ ...e, bullets: e.bullets.slice(0, 2) })),
      projects: base.projects.slice(0, 1).map((p) => ({ ...p, bullets: p.bullets.slice(0, 2) })),
    },
    fonts,
    "tight"
  );
  return doc.save();
}
