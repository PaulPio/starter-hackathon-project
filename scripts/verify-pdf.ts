import { readFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: tsx scripts/verify-pdf.ts <path>");
  const bytes = await readFile(path);
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  console.log(`Pages: ${totalPages}`);
  console.log("---");
  console.log(text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
