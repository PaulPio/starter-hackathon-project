import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, type Color } from "pdf-lib";
import type { ResumePdfData } from "./schemas";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 56;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.4, 0.4, 0.4);
const RULE = rgb(0.75, 0.75, 0.75);

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

class ResumeLayout {
  private doc: PDFDocument;
  private page!: PDFPage;
  private y = 0;

  constructor(doc: PDFDocument) {
    this.doc = doc;
    this.addPage();
  }

  private addPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  private ensureSpace(lineHeight: number) {
    if (this.y - lineHeight < MARGIN_BOTTOM) {
      this.addPage();
    }
  }

  addGap(px: number) {
    this.y -= px;
    if (this.y < MARGIN_BOTTOM) this.addPage();
  }

  drawLine(text: string, opts: { x?: number; size: number; font: PDFFont; color?: Color; lineHeight?: number }) {
    const lineHeight = opts.lineHeight ?? opts.size * 1.25;
    this.ensureSpace(lineHeight);
    this.page.drawText(sanitizeForPdf(text), {
      x: opts.x ?? MARGIN_X,
      y: this.y - opts.size,
      size: opts.size,
      font: opts.font,
      color: opts.color ?? INK,
    });
    this.y -= lineHeight;
  }

  drawWrapped(text: string, opts: { x?: number; maxWidth?: number; size: number; font: PDFFont; color?: Color; lineHeight?: number }) {
    const x = opts.x ?? MARGIN_X;
    const maxWidth = opts.maxWidth ?? CONTENT_WIDTH;
    const lines = wrapText(sanitizeForPdf(text), opts.font, opts.size, maxWidth);
    for (const line of lines) {
      this.drawLine(line, { x, size: opts.size, font: opts.font, color: opts.color, lineHeight: opts.lineHeight });
    }
  }

  drawBulletLines(text: string, opts: { size: number; font: PDFFont; lineHeight?: number }) {
    const markerX = MARGIN_X;
    const textX = MARGIN_X + BULLET_INDENT;
    const maxWidth = CONTENT_WIDTH - BULLET_INDENT;
    const lh = opts.lineHeight ?? opts.size * 1.25;
    const lines = wrapText(sanitizeForPdf(text), opts.font, opts.size, maxWidth);

    lines.forEach((line, i) => {
      this.ensureSpace(lh);
      if (i === 0) {
        this.page.drawText("•", { x: markerX, y: this.y - opts.size, size: opts.size, font: opts.font, color: INK });
      }
      this.page.drawText(line, { x: textX, y: this.y - opts.size, size: opts.size, font: opts.font, color: INK });
      this.y -= lh;
    });
  }

  drawRule() {
    const y = this.y;
    this.page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: MARGIN_X + CONTENT_WIDTH, y },
      thickness: 0.75,
      color: RULE,
    });
  }
}

interface Fonts {
  font: PDFFont;
  fontBold: PDFFont;
  fontItalic: PDFFont;
}

function drawHeader(layout: ResumeLayout, data: ResumePdfData, fonts: Fonts) {
  layout.drawLine(data.name ?? "Resume", { size: 20, font: fonts.fontBold });
  layout.addGap(2);

  const contactParts = [data.contact.email, data.contact.phone, data.contact.linkedin, data.contact.github].filter(
    (v): v is string => Boolean(v)
  );
  if (contactParts.length > 0) {
    layout.drawWrapped(contactParts.join("  |  "), { size: 9, font: fonts.font, color: MUTED });
  }

  layout.addGap(4);
  layout.drawWrapped(data.targetJobLabel, { size: 9, font: fonts.fontItalic, color: MUTED });
  layout.addGap(16);
}

function drawSectionHeading(layout: ResumeLayout, label: string, fonts: Fonts) {
  layout.addGap(14);
  layout.drawLine(label, { size: 11.5, font: fonts.fontBold });
  layout.addGap(2);
  layout.drawRule();
  layout.addGap(6);
}

function drawSummary(layout: ResumeLayout, data: ResumePdfData, fonts: Fonts) {
  if (!data.tailoredSummary.trim()) return;
  layout.drawWrapped(data.tailoredSummary, { size: 10, font: fonts.font, lineHeight: 13.5 });
}

function drawEducation(layout: ResumeLayout, data: ResumePdfData, fonts: Fonts) {
  if (data.education.length === 0) return;
  drawSectionHeading(layout, "EDUCATION", fonts);
  for (const edu of data.education) {
    const parts = [edu.school];
    if (edu.degree) parts.push(edu.degree);
    if (edu.field) parts.push(edu.field);
    let line = parts.join(" — ");
    if (edu.gradDate) line += `, ${edu.gradDate}`;
    layout.drawWrapped(line, { size: 10, font: fonts.font, lineHeight: 13 });
    layout.addGap(4);
  }
}

function drawExperience(layout: ResumeLayout, data: ResumePdfData, fonts: Fonts) {
  if (data.experience.length === 0) return;
  drawSectionHeading(layout, "EXPERIENCE", fonts);
  for (const exp of data.experience) {
    layout.drawWrapped(`${exp.title}, ${exp.company}`, { size: 10.5, font: fonts.fontBold });
    layout.addGap(3);
    for (const bullet of exp.bullets) {
      layout.drawBulletLines(bullet, { size: 10, font: fonts.font, lineHeight: 13 });
      layout.addGap(2);
    }
    layout.addGap(8);
  }
}

function drawSkills(layout: ResumeLayout, data: ResumePdfData, fonts: Fonts) {
  if (data.skills.length === 0) return;
  drawSectionHeading(layout, "SKILLS", fonts);
  layout.drawWrapped(data.skills.join("  •  "), { size: 10, font: fonts.font, lineHeight: 13 });
}

export async function generateResumePdf(data: ResumePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const fonts: Fonts = { font, fontBold, fontItalic };

  const layout = new ResumeLayout(doc);

  drawHeader(layout, data, fonts);
  drawSummary(layout, data, fonts);
  drawEducation(layout, data, fonts);
  drawExperience(layout, data, fonts);
  drawSkills(layout, data, fonts);

  return doc.save();
}
