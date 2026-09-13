import { describe, expect, test } from "vitest";
import { mapImportHeaders, readImportRow } from "./catalog";
import { parseCsv, parseCsvRows } from "./csv";

describe("parseCsv", () => {
  test("handles quotes, embedded commas, newlines and doubled quotes", () => {
    const text = 'name,price\r\n"Chips, BBQ",35\r\n"Say ""hi""",10\n"Two\nlines",5\n';
    expect(parseCsv(text)).toEqual([
      ["name", "price"], ["Chips, BBQ", "35"], ['Say "hi"', "10"], ["Two\nlines", "5"],
    ]);
  });

  test("strips a byte-order mark and skips blank lines", () => {
    expect(parseCsv("﻿a,b\n\n1,2\r\n\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  test("keeps empty cells and a last line with no newline", () => {
    expect(parseCsv("a,,c\n,,")).toEqual([["a", "", "c"], ["", "", ""]]);
  });

  test("row numbers match the spreadsheet when there are blank lines or multi-line cells", () => {
    const rows = parseCsvRows('name,price\n\nCola,45\r\n\r\n"Two\nlines",5\nChips,35');
    expect(rows.map((r) => [r.cells[0], r.rowNumber])).toEqual([
      ["name", 1], ["Cola", 3], ["Two\nlines", 5], ["Chips", 6],
    ]);
  });
});

describe("import rows", () => {
  const { columns, missing } = mapImportHeaders(["Product Name", "Selling_Price", "Cost", "Barcode", "Category"]);

  test("maps header aliases", () => {
    expect(missing).toEqual([]);
    expect(columns).toMatchObject({ name: 0, price: 1, cost: 2, barcode: 3, category: 4 });
    expect(mapImportHeaders(["foo"]).missing).toEqual(["name", "price"]);
  });

  test("reads a good row", () => {
    expect(readImportRow(["Soy sauce", "25.00", "19", "4800016644290", "Condiments"], columns, 2)).toEqual({
      row: { row: 2, name: "Soy sauce", price: 2500, cost: 1900, barcode: "4800016644290", category: "Condiments", kind: "stocked" },
      errors: [],
    });
  });

  test("explains a bad row", () => {
    const result = readImportRow(["", "twelve", "", "has space", ""], columns, 3);
    expect(result.row).toBeNull();
    expect(result.errors).toEqual(["Name is missing.", "Price “twelve” is not an amount."]);
    expect(readImportRow(["Soap", "10", "", "has space", ""], columns, 4).errors[0]).toMatch(/barcode/);
  });
});
