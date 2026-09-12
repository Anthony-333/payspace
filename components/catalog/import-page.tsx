"use client";

import { useMutation } from "convex/react";
import { CircleAlert, CircleCheck, FileUp } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shop/page-header";
import { canManage, useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import { LIMITS, mapImportHeaders, readImportRow, type ImportColumn, type ImportRow } from "@/convex/lib/catalog";
import { parseCsv } from "@/convex/lib/csv";
import { formatMoney } from "@/convex/lib/money";
import { errorMessage } from "@/lib/errors";

type Problem = { row: number; message: string };
type Parsed = { fileName: string; columns: ImportColumn[]; ready: ImportRow[]; problems: Problem[] };
type Result = { created: number; problems: Problem[] };

const COLUMN_LABEL: Record<ImportColumn, string> = {
  name: "Name", price: "Price", cost: "Cost", category: "Category", barcode: "Barcode", sku: "SKU", kind: "Type",
};

/** Reads the file in the browser: every row is checked here first, then again on the server. */
function parseFile(fileName: string, text: string): Parsed | string {
  const [headers, ...lines] = parseCsv(text);
  if (!headers) return "That file is empty.";
  const { columns, missing } = mapImportHeaders(headers);
  if (missing.length) {
    return `The file needs a ${missing.map((c) => COLUMN_LABEL[c]).join(" and a ")} column. Found: ${headers.join(", ")}.`;
  }
  if (lines.length > LIMITS.importRows) {
    return `Import up to ${LIMITS.importRows.toLocaleString()} rows at a time. This file has ${lines.length.toLocaleString()}.`;
  }

  const ready: ImportRow[] = [];
  const problems: Problem[] = [];
  const barcodeRow = new Map<string, number>();
  lines.forEach((cells, index) => {
    const rowNumber = index + 2; // line 1 is the header
    const { row, errors } = readImportRow(cells, columns, rowNumber);
    if (!row) return problems.push({ row: rowNumber, message: errors.join(" ") });
    if (row.barcode) {
      const first = barcodeRow.get(row.barcode);
      if (first) return problems.push({ row: rowNumber, message: `Barcode ${row.barcode} is also on row ${first}.` });
      barcodeRow.set(row.barcode, rowNumber);
    }
    ready.push(row);
  });
  return { fileName, columns: Object.keys(columns) as ImportColumn[], ready, problems };
}

export function ImportPage() {
  const shop = useShop();
  const importBatch = useMutation(api.products.importBatch);
  const fileInput = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  if (!canManage(shop.role)) {
    return <PageHeader title="Import products" description="Only owners and managers can import products." />;
  }

  async function onFile(file: File) {
    setResult(null);
    const outcome = parseFile(file.name, await file.text());
    if (typeof outcome === "string") {
      setParsed(null);
      toast.error(outcome);
    } else {
      setParsed(outcome);
    }
  }

  async function onImport() {
    if (!parsed) return;
    const problems = [...parsed.problems];
    let created = 0;
    setProgress(0);
    try {
      for (let i = 0; i < parsed.ready.length; i += LIMITS.importBatch) {
        const batch = await importBatch({ tenantId: shop.tenantId, rows: parsed.ready.slice(i, i + LIMITS.importBatch) });
        created += batch.created;
        problems.push(...batch.errors);
        setProgress(Math.min(i + LIMITS.importBatch, parsed.ready.length));
      }
    } catch (err) {
      toast.error(`${errorMessage(err)} ${created} products were imported before the error.`);
    }
    problems.sort((a, b) => a.row - b.row);
    setResult({ created, problems });
    setParsed(null);
    setProgress(null);
  }

  return (
    <>
      <PageHeader
        title="Import products"
        description="Upload a CSV file saved from Excel or Google Sheets. Rows with problems are skipped, not the whole file."
        actions={<Button variant="outline" size="lg" className="h-10" asChild><Link href={`/${shop.slug}/products`}>Back to products</Link></Button>}
      />

      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = "";
        }}
      />

      {result && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleCheck className="size-5 text-green-600" />
              Imported {result.created} {result.created === 1 ? "product" : "products"}
            </CardTitle>
            <CardDescription>
              {result.problems.length
                ? `${result.problems.length} ${result.problems.length === 1 ? "row was" : "rows were"} skipped. Fix them in your spreadsheet and import just those rows again.`
                : "Every row was imported."}
            </CardDescription>
          </CardHeader>
          {result.problems.length > 0 && (
            <CardContent>
              <ProblemTable problems={result.problems} />
            </CardContent>
          )}
        </Card>
      )}

      {!parsed ? (
        <Card>
          <CardHeader>
            <CardTitle>Choose a CSV file</CardTitle>
            <CardDescription>
              The first row must be column names. <strong>Name</strong> and <strong>Price</strong> are required;{" "}
              {(["category", "cost", "barcode", "sku", "kind"] as const).map((c) => COLUMN_LABEL[c]).join(", ")} are optional.
              Type is “stocked” (the default) or “service”. Prices are in pesos, like 45 or 45.50.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
{`Name,Category,Price,Cost,Barcode
Soy sauce 350 ml,Condiments,25.00,19.00,4800016644290
Instant noodles,Snacks,15,11,`}
            </pre>
            <Button size="lg" className="h-11 w-fit" onClick={() => fileInput.current?.click()}>
              <FileUp /> Choose file
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{parsed.fileName}</CardTitle>
            <CardDescription>
              Found columns: {parsed.columns.map((c) => COLUMN_LABEL[c]).join(", ")}. Ignored: anything else.
              {" "}Categories that don&apos;t exist yet are created.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5"><CircleCheck className="size-4 text-green-600" /> {parsed.ready.length} ready to import</span>
              {parsed.problems.length > 0 && (
                <span className="flex items-center gap-1.5 text-destructive"><CircleAlert className="size-4" /> {parsed.problems.length} with problems, will be skipped</span>
              )}
            </div>

            {parsed.problems.length > 0 && <ProblemTable problems={parsed.problems} />}

            {parsed.ready.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-medium">
                  Preview{parsed.ready.length > 20 ? ` (first 20 of ${parsed.ready.length})` : ""}
                </h2>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead>Barcode</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.ready.slice(0, 20).map((row) => (
                        <TableRow key={row.row}>
                          <TableCell className="text-muted-foreground">{row.row}</TableCell>
                          <TableCell>{row.name}{row.kind === "service" && <span className="text-muted-foreground"> (service)</span>}</TableCell>
                          <TableCell>{row.category ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(row.price)}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.cost === undefined ? "—" : formatMoney(row.cost)}</TableCell>
                          <TableCell className="font-mono text-xs">{row.barcode ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button size="lg" className="h-11" disabled={parsed.ready.length === 0 || progress !== null} onClick={onImport}>
                {progress !== null
                  ? `Importing… ${progress} of ${parsed.ready.length}`
                  : `Import ${parsed.ready.length} ${parsed.ready.length === 1 ? "product" : "products"}`}
              </Button>
              <Button variant="outline" size="lg" className="h-11" disabled={progress !== null} onClick={() => fileInput.current?.click()}>
                Choose another file
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function ProblemTable({ problems }: { problems: Problem[] }) {
  return (
    <div className="max-h-80 overflow-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Row</TableHead>
            <TableHead>Problem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {problems.map((p, i) => (
            <TableRow key={`${p.row}-${i}`}>
              <TableCell className="text-muted-foreground">{p.row}</TableCell>
              <TableCell className="whitespace-normal text-destructive">{p.message}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
