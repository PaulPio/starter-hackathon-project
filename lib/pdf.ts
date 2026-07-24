import { extractText, getDocumentProxy } from "unpdf";

export class PdfExtractionError extends Error {}

// A resume with almost no extractable text is very likely a scanned/image-only
// PDF that pdf.js can't read — fail fast with a clear message instead of
// feeding near-empty text to the LLM and getting a garbage profile back.
const MIN_EXTRACTABLE_CHARS = 100;

export async function extractResumeText(fileBytes: ArrayBuffer): Promise<string> {
  let text: string;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(fileBytes));
    const result = await extractText(pdf, { mergePages: true });
    text = result.text;
  } catch (e) {
    throw new PdfExtractionError(
      `Could not read this PDF. It may be corrupted or password-protected. (${String(e)})`
    );
  }

  const trimmed = text.trim();
  if (trimmed.length < MIN_EXTRACTABLE_CHARS) {
    throw new PdfExtractionError(
      "Couldn't find readable text in this PDF — it looks like a scanned image rather than a text-based document. Try exporting your resume as a text-based PDF (e.g. from Google Docs or Word)."
    );
  }
  return trimmed;
}
