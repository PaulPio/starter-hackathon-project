// Parses the speedyapply-style README: multiple pipe tables under nested
// ## / ### headings, with columns that differ between tables (the "Other"
// table omits Salary) and a Posting column that's an <a href><img/></a>
// (an image, not link text) rather than a plain markdown link.

export interface RawJobRow {
  section: string; // nearest ## heading
  category: string; // nearest ### heading
  cells: Record<string, string>; // lowercased header -> raw cell content
}

const HEADING_RE = /^(#{2,3})\s+(.*)$/;
const ROW_RE = /^\s*\|(.+)\|\s*$/;
const SEPARATOR_RE = /^\s*\|?[\s:-]+\|[\s|:-]*$/;

function splitRow(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.slice(1, -1); // drop leading/trailing pipe
  return inner.split("|").map((cell) => cell.trim());
}

export function parseMarkdownTables(markdown: string): RawJobRow[] {
  const lines = markdown.split("\n");
  const rows: RawJobRow[] = [];
  let section = "";
  let category = "";
  let i = 0;

  while (i < lines.length) {
    const headingMatch = lines[i].match(HEADING_RE);
    if (headingMatch) {
      if (headingMatch[1] === "##") {
        section = headingMatch[2].trim();
        category = "";
      } else {
        category = headingMatch[2].trim();
      }
      i++;
      continue;
    }

    const isHeaderRow = ROW_RE.test(lines[i]) && SEPARATOR_RE.test(lines[i + 1] ?? "");
    if (isHeaderRow) {
      const headers = splitRow(lines[i]).map((h) => h.toLowerCase());
      i += 2; // skip header + separator line
      while (i < lines.length && ROW_RE.test(lines[i])) {
        try {
          const cells = splitRow(lines[i]);
          const record: Record<string, string> = {};
          headers.forEach((header, idx) => {
            record[header] = cells[idx] ?? "";
          });
          rows.push({ section, category, cells: record });
        } catch {
          // Skip a malformed row rather than aborting the whole parse.
        }
        i++;
      }
      continue;
    }

    i++;
  }

  return rows;
}

export function extractHref(cellHtml: string): string | null {
  return cellHtml.match(/<a\s+href="([^"]+)"/i)?.[1] ?? null;
}

export function stripTags(cellHtml: string): string {
  return cellHtml.replace(/<[^>]+>/g, "").trim();
}
