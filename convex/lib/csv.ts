// CSV parsing (RFC 4180) shared by the import preview and tests. No dependency needed.

/** A parsed row and its 1-based row number in a spreadsheet, where blank lines still count. */
export type CsvRow = { cells: string[]; rowNumber: number };

/**
 * Parses CSV text into rows of cells. Handles quoted fields with commas, newlines and
 * doubled quotes, CRLF or LF line endings, and a leading byte-order mark.
 * Blank lines are skipped, but each row keeps the number a spreadsheet would show.
 */
export function parseCsvRows(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let rowNumber = 0;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  const endRow = () => {
    row.push(cell);
    rowNumber++;
    if (row.length > 1 || row[0].trim() !== "") rows.push({ cells: row, rowNumber });
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

/** Just the cells of each non-blank row. */
export function parseCsv(text: string): string[][] {
  return parseCsvRows(text).map((row) => row.cells);
}

/** Lowercases and collapses a header so "Selling Price" and "selling_price" match. */
export function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}
