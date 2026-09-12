// CSV parsing (RFC 4180) shared by the import preview and tests. No dependency needed.

/**
 * Parses CSV text into rows of cells. Handles quoted fields with commas, newlines and
 * doubled quotes, CRLF or LF line endings, and a leading byte-order mark.
 * Blank lines are skipped.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  const endRow = () => {
    row.push(cell);
    if (row.length > 1 || row[0].trim() !== "") rows.push(row);
    row = [];
    cell = "";
  };

  for (; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) endRow();
  return rows;
}

/** Lowercases and collapses a header so "Selling Price" and "selling_price" match. */
export function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}
