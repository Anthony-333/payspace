import { normalizeHeader } from "./csv";
import { MAX_MONEY, parseMoney } from "./money";

// Catalog field rules shared by Convex functions, product forms and the CSV import preview.
// Each check returns an error message, or null when the value is fine.

export const LIMITS = { productName: 80, categoryName: 60, barcode: 64, sku: 40, importRows: 5000, importBatch: 100 };

export function checkProductName(name: string) {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= LIMITS.productName
    ? null
    : `Enter a product name up to ${LIMITS.productName} characters.`;
}

/** Barcodes are printable ASCII with no spaces, which covers EAN, UPC and in-house codes. */
export function checkBarcode(barcode: string) {
  return /^[\x21-\x7e]+$/.test(barcode) && barcode.length <= LIMITS.barcode
    ? null
    : `A barcode is up to ${LIMITS.barcode} letters or digits with no spaces.`;
}

export function checkSku(sku: string) {
  return sku.length <= LIMITS.sku ? null : `An SKU is up to ${LIMITS.sku} characters.`;
}

export function checkPrice(label: string, value: number) {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_MONEY ? null : `${label} is not a valid amount.`;
}

/** Trims optional text; empty becomes undefined so it isn't stored. */
export function optionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

// ---- CSV import ----

export type ImportKind = "stocked" | "service";

/** A validated row, as sent to `products.importBatch`. `row` is the 1-based line in the file. */
export type ImportRow = {
  row: number;
  name: string;
  category?: string;
  price: number;
  cost?: number;
  barcode?: string;
  sku?: string;
  kind: ImportKind;
};

export const IMPORT_COLUMNS = {
  name: ["name", "product", "product name", "item", "item name", "description"],
  price: ["price", "selling price", "srp", "retail price"],
  cost: ["cost", "unit cost", "cost price"],
  category: ["category", "department"],
  barcode: ["barcode", "upc", "ean", "gtin"],
  sku: ["sku", "code", "item code"],
  kind: ["type", "kind"],
} as const;

export type ImportColumn = keyof typeof IMPORT_COLUMNS;
export type ImportColumnMap = Partial<Record<ImportColumn, number>>;

export function mapImportHeaders(headers: string[]) {
  const normalized = headers.map(normalizeHeader);
  const columns: ImportColumnMap = {};
  for (const [column, aliases] of Object.entries(IMPORT_COLUMNS) as [ImportColumn, readonly string[]][]) {
    const index = normalized.findIndex((h) => aliases.includes(h));
    if (index !== -1) columns[column] = index;
  }
  const missing = (["name", "price"] as const).filter((c) => columns[c] === undefined);
  return { columns, missing };
}

/** Checks a row's values. Used on raw CSV cells in the browser and again on the server. */
export function checkImportRow(row: Omit<ImportRow, "row">) {
  const errors: string[] = [];
  const nameError = checkProductName(row.name);
  if (nameError) errors.push(nameError);
  const priceError = checkPrice("Price", row.price);
  if (priceError) errors.push(priceError);
  if (row.cost !== undefined) {
    const costError = checkPrice("Cost", row.cost);
    if (costError) errors.push(costError);
  }
  if (row.barcode !== undefined) {
    const barcodeError = checkBarcode(row.barcode);
    if (barcodeError) errors.push(barcodeError);
  }
  if (row.sku !== undefined) {
    const skuError = checkSku(row.sku);
    if (skuError) errors.push(skuError);
  }
  if (row.category !== undefined && row.category.length > LIMITS.categoryName) {
    errors.push(`A category name is up to ${LIMITS.categoryName} characters.`);
  }
  if (row.kind !== "stocked" && row.kind !== "service") errors.push("Type must be “stocked” or “service”.");
  return errors;
}

/** Turns one line of CSV cells into an import row, or the reasons it can't be imported. */
export function readImportRow(cells: string[], columns: ImportColumnMap, rowNumber: number) {
  const cell = (column: ImportColumn) => {
    const index = columns[column];
    return index === undefined ? undefined : optionalText(cells[index]);
  };
  const errors: string[] = [];

  const priceText = cell("price");
  const price = priceText === undefined ? null : parseMoney(priceText);
  if (price === null) errors.push(priceText === undefined ? "Price is missing." : `Price “${priceText}” is not an amount.`);

  const costText = cell("cost");
  const cost = costText === undefined ? undefined : parseMoney(costText);
  if (cost === null) errors.push(`Cost “${costText}” is not an amount.`);

  const kindText = cell("kind")?.toLowerCase() ?? "stocked";
  const kind = kindText === "service" ? "service" : kindText === "stocked" || kindText === "product" ? "stocked" : null;
  if (kind === null) errors.push(`Type “${kindText}” should be “stocked” or “service”.`);

  const name = cell("name") ?? "";
  if (price === null || cost === null || kind === null) {
    if (!name) errors.unshift("Name is missing.");
    return { row: null, errors };
  }

  const row: ImportRow = {
    row: rowNumber,
    name,
    price,
    kind,
    ...(cost !== undefined && { cost }),
    ...(cell("category") !== undefined && { category: cell("category") }),
    ...(cell("barcode") !== undefined && { barcode: cell("barcode") }),
    ...(cell("sku") !== undefined && { sku: cell("sku") }),
  };
  const rowErrors = checkImportRow(row);
  return rowErrors.length ? { row: null, errors: rowErrors } : { row, errors: [] };
}
