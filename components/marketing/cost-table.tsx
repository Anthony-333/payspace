import { formatBps, formatMoney } from "@/convex/lib/money";
import { type CostExample, lineCost, summarize } from "@/lib/costing-example";

const UNIT: Record<string, string> = { g: "g", ml: "ml", pc: "pc" };

// A worked recipe-costing table: each line's cost, then price, VAT, profit and margin. The
// "Bought as" column hides on phones so the cost column stays in view.
export function CostTable({ example }: { example: CostExample }) {
  const s = summarize(example);
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl bg-muted p-5 sm:p-6">
      <table className="w-full border-collapse text-[15px]">
        <caption className="pb-3 text-left font-semibold text-foreground">{example.product}</caption>
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="border-b py-2 pr-3 font-medium">Item</th>
            <th className="border-b py-2 pr-3 font-medium">Used</th>
            <th className="hidden border-b py-2 pr-3 font-medium sm:table-cell">Bought as</th>
            <th className="border-b py-2 !text-right font-medium">Cost</th>
          </tr>
        </thead>
        <tbody>
          {example.lines.map((l) => (
            <tr key={l.item}>
              <td className="border-b py-2 pr-3">{l.item}</td>
              <td className="border-b py-2 pr-3 whitespace-nowrap">
                {l.use} {UNIT[l.unit]}
              </td>
              <td className="hidden border-b py-2 pr-3 text-muted-foreground sm:table-cell">
                {formatMoney(l.buyPrice)} / {l.buyLabel}
              </td>
              <td className="border-b py-2 text-right tabular-nums">{formatMoney(lineCost(l))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="text-foreground">
          <Row label={example.price > 0 ? "Cost per item" : "Total cost"} value={formatMoney(s.cost)} strong />
          {/* A price of 0 shows ingredient costs only, e.g. a whole batch before dividing. */}
          {example.price > 0 && (
            <>
              <Row label="Selling price" value={formatMoney(example.price)} />
              {example.vatRateBps > 0 && (
                <Row label={`Price without ${formatBps(example.vatRateBps).replace(".0%", "%")} VAT`} value={formatMoney(s.net)} />
              )}
              <Row label="Profit per item" value={formatMoney(s.profit)} strong />
              <Row label="Gross margin" value={formatBps(s.marginBps)} strong />
            </>
          )}
        </tfoot>
      </table>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr>
      <td colSpan={2} className={`pt-2 pr-3 ${strong ? "font-semibold" : ""}`}>
        {label}
      </td>
      <td className="hidden sm:table-cell" />
      <td className={`pt-2 text-right tabular-nums ${strong ? "font-semibold" : ""}`}>{value}</td>
    </tr>
  );
}
