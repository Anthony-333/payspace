import {
  ChartColumn,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Donut,
  Gift,
  Home,
  Link2,
  Milk,
  Package,
  Printer,
  Receipt,
  Sandwich,
  Search,
  Settings,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

// Miniature, static drawings of real Payspace screens for the landing page. They are
// decorative: each frame carries one label for screen readers and hides the rest.

export function TabletFrame({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("rounded-[28px] bg-foreground p-2 shadow-2xl shadow-black/20", className)}
    >
      <div aria-hidden className="h-full overflow-hidden rounded-[21px] bg-muted text-foreground">
        {children}
      </div>
    </div>
  );
}

function Rail({ active }: { active: number }) {
  const items: LucideIcon[] = [Home, Receipt, Package, ChartColumn, Gift, Settings];
  return (
    <div className="flex w-9 shrink-0 flex-col items-center gap-2 border-r bg-card py-3">
      <span className="mb-1 grid size-5 place-items-center rounded-[6px] bg-primary text-[8px] font-bold text-primary-foreground">
        P
      </span>
      {items.map((Icon, i) => (
        <span
          key={i}
          className={cn(
            "grid size-6 place-items-center rounded-[6px] text-muted-foreground",
            i === active && "bg-accent text-primary",
          )}
        >
          <Icon className="size-3" />
        </span>
      ))}
    </div>
  );
}

const TILES: { name: string; price: string; icon: LucideIcon; tint: string }[] = [
  { name: "Spanish latte", price: "$5.25", icon: Coffee, tint: "bg-tint-peach text-tint-peach-foreground" },
  { name: "Croissant", price: "$3.75", icon: Croissant, tint: "bg-tint-green text-tint-green-foreground" },
  { name: "Iced matcha", price: "$5.50", icon: CupSoda, tint: "bg-tint-green text-tint-green-foreground" },
  { name: "Glazed donut", price: "$2.50", icon: Donut, tint: "bg-tint-violet text-tint-violet-foreground" },
  { name: "Club sandwich", price: "$8.50", icon: Sandwich, tint: "bg-tint-blue text-tint-blue-foreground" },
  { name: "Choco cookie", price: "$2.25", icon: Cookie, tint: "bg-tint-peach text-tint-peach-foreground" },
  { name: "Fresh milk", price: "$3.25", icon: Milk, tint: "bg-tint-blue text-tint-blue-foreground" },
  { name: "Americano", price: "$3.50", icon: Coffee, tint: "bg-tint-violet text-tint-violet-foreground" },
];

export function PosMockup() {
  return (
    <div className="flex h-full text-[9px] leading-tight">
      <Rail active={0} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5">
        <div className="flex items-center gap-1.5 rounded-[6px] bg-card px-2 py-1.5 text-muted-foreground">
          <Search className="size-2.5" /> Search menu
        </div>
        <div className="flex gap-1">
          {["All", "Coffee", "Pastries", "Cold"].map((c, i) => (
            <span
              key={c}
              className={cn(
                "rounded-full px-2 py-0.5",
                i === 0 ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
              )}
            >
              {c}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {TILES.map((t) => (
            <div key={t.name} className="rounded-[8px] bg-card p-1.5">
              <div className={cn("mb-1 grid aspect-[4/3] place-items-center rounded-[6px]", t.tint)}>
                <t.icon className="size-4" />
              </div>
              <div className="truncate font-semibold">{t.name}</div>
              <div className="text-primary">{t.price}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex w-[34%] shrink-0 flex-col gap-1.5 border-l bg-card p-2.5">
        <div className="font-bold">Order #0142</div>
        {[
          ["2× Spanish latte", "$10.50"],
          ["1× Croissant", "$3.75"],
          ["1× Choco cookie", "$2.25"],
        ].map(([n, p]) => (
          <div key={n} className="flex justify-between gap-1 border-b border-dashed pb-1">
            <span className="truncate">{n}</span>
            <span>{p}</span>
          </div>
        ))}
        <div className="mt-auto space-y-0.5 text-muted-foreground">
          <div className="flex justify-between">
            <span>Tax (incl.)</span>
            <span>$1.50</span>
          </div>
          <div className="flex justify-between font-bold text-foreground">
            <span>Total</span>
            <span>$16.50</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-0.5 rounded-[6px] bg-muted p-0.5 text-center">
          {["Cash", "E-wallet", "Card"].map((m, i) => (
            <span key={m} className={cn("rounded py-0.5", i === 1 && "bg-card text-primary")}>
              {m}
            </span>
          ))}
        </div>
        <div className="rounded-[6px] bg-primary py-1.5 text-center font-bold text-primary-foreground">
          Charge $16.50
        </div>
      </div>
    </div>
  );
}

const BARS = [38, 52, 44, 61, 57, 74, 68];

export function DashboardMockup() {
  return (
    <div className="flex h-full text-[9px] leading-tight">
      <Rail active={3} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5">
        <div className="text-[11px] font-bold">Today</div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            ["Sales", "$2,438", "+12%"],
            ["Profit", "$1,512", "+9%"],
            ["Margin", "62%", "+2 pts"],
          ].map(([k, v, d]) => (
            <div key={k} className="rounded-[8px] bg-card p-2">
              <div className="text-muted-foreground">{k}</div>
              <div className="text-[12px] font-bold">{v}</div>
              <div className="text-tint-green-foreground">{d} vs last week</div>
            </div>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-5 gap-1.5">
          <div className="col-span-3 flex flex-col rounded-[8px] bg-card p-2">
            <div className="mb-1 font-semibold">Profit this week</div>
            <div className="flex flex-1 items-end gap-1.5">
              {BARS.map((h, i) => (
                <div
                  key={i}
                  className={cn("flex-1 rounded-t", i === 5 ? "bg-brand" : "bg-brand/30")}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          <div className="col-span-2 space-y-1 rounded-[8px] bg-card p-2">
            <div className="font-semibold">Top by profit</div>
            {[
              ["Spanish latte", "$406"],
              ["Iced matcha", "$341"],
              ["Croissant", "$188"],
              ["Club sandwich", "$152"],
            ].map(([n, p]) => (
              <div key={n} className="flex justify-between gap-1">
                <span className="truncate">{n}</span>
                <span className="font-semibold">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecipeMockup() {
  const lines = [
    ["Espresso beans", "18 g", "$0.72"],
    ["Fresh milk", "180 ml", "$0.27"],
    ["Condensed milk", "30 ml", "$0.18"],
    ["Cup and lid", "1 pc", "$0.28"],
  ];
  return (
    <div className="flex h-full text-[9px] leading-tight">
      <Rail active={2} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold">Spanish latte · recipe</div>
          <span className="rounded-full bg-tint-green px-2 py-0.5 font-semibold text-tint-green-foreground">
            72.4% margin
          </span>
        </div>
        <div className="rounded-[8px] bg-card p-2">
          <div className="mb-1 grid grid-cols-[1fr_auto_auto] gap-x-3 text-muted-foreground">
            <span>Ingredient</span>
            <span>Qty</span>
            <span className="text-right">Cost</span>
          </div>
          {lines.map(([n, q, c]) => (
            <div key={n} className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-t py-1">
              <span className="truncate">{n}</span>
              <span>{q}</span>
              <span className="text-right">{c}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            ["Cost", "$1.45"],
            ["Price", "$5.25"],
            ["Profit", "$3.80"],
          ].map(([k, v], i) => (
            <div key={k} className={cn("rounded-[8px] p-2", i === 2 ? "bg-primary text-primary-foreground" : "bg-card")}>
              <div className={i === 2 ? "opacity-80" : "text-muted-foreground"}>{k}</div>
              <div className="text-[12px] font-bold">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StockMockup() {
  const rows: [string, string, string, boolean][] = [
    ["Fresh milk", "4.2 L", "$1.50 / L", false],
    ["Espresso beans", "0.6 kg", "$40.00 / kg", true],
    ["Cup and lid 16 oz", "320 pc", "$0.28 / pc", false],
    ["Condensed milk", "1.1 L", "$6.00 / L", false],
    ["Matcha powder", "90 g", "$0.12 / g", true],
  ];
  return (
    <div className="flex h-full text-[9px] leading-tight">
      <Rail active={2} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold">Stock items</div>
          <span className="rounded-[6px] bg-primary px-2 py-0.5 text-primary-foreground">+ Receive</span>
        </div>
        <div className="rounded-[8px] bg-card px-2">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 py-1 text-muted-foreground">
            <span>Item</span>
            <span>On hand</span>
            <span className="text-right">Avg cost</span>
          </div>
          {rows.map(([n, q, c, low]) => (
            <div key={n} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-t py-1.5">
              <span className="flex min-w-0 items-center gap-1 truncate">
                {n}
                {low && <TriangleAlert className="size-2.5 shrink-0 text-primary" />}
              </span>
              <span className={cn(low && "font-semibold text-primary")}>{q}</span>
              <span className="text-right">{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hand-drawn-looking signatures for the loyalty mockups, in a 100 × 40 box.
const SIGNATURES = [
  "M6 28c6-14 10-20 13-16s-5 18 1 14 9-16 14-12-2 12 4 10 8-10 12-8 3 8 8 6 10-8 16-7 8 4 14 2",
  "M8 24c4-10 12-16 12-8s-6 14 0 10 10-18 16-10-4 12 2 10c8-3 12-14 18-12s-2 10 6 9 14-6 26-4",
  "M10 30c10-4 8-22 16-18s-8 16 2 14 6-12 12-10 2 8 8 6 6-10 12-8-2 10 6 8 10-4 18-6",
  "M6 22c8 0 10-12 18-10s-10 14 0 14 14-14 20-12-6 10 2 10 12-8 18-8 6 6 12 4 8-4 16-6",
];

function Squiggle({ i, className }: { i: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 40" className={className} fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
      <path d={SIGNATURES[i % SIGNATURES.length]} />
    </svg>
  );
}

// The loyalty card face (matches components/loyalty/stamp-card.tsx, teal).
export function StampCardMockup({ filled, total = 10, className }: { filled: number; total?: number; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[10px] bg-[#16625f] p-2.5 text-white", className)}>
      <div className="pointer-events-none absolute -top-8 -right-8 size-24 rounded-full bg-white/10" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[7px] font-medium tracking-wide text-white/80 uppercase">Corner Cup Coffee</div>
          <div className="truncate text-[11px] font-semibold">Coffee card</div>
        </div>
        <span className="shrink-0 rounded-full bg-white/15 px-1.5 py-0.5 font-semibold tabular-nums">
          {filled} / {total}
        </span>
      </div>
      <div className="relative mt-2 grid grid-cols-5 gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "grid aspect-square place-items-center rounded-full",
              i < filled ? "bg-white text-[#0f4644]" : "border border-dashed border-white/40",
            )}
          >
            {i < filled ? (
              <span className="grid size-[86%] -rotate-6 place-items-center rounded-full border border-current/60 p-[10%]">
                <Squiggle i={i} className="w-full" />
              </span>
            ) : i === total - 1 ? (
              <Gift className="size-1/3 text-white/70" />
            ) : (
              <span className="text-[7px] font-semibold text-white/50">{i + 1}</span>
            )}
          </div>
        ))}
      </div>
      <div className="relative mt-2 text-white/90">
        <span className="font-semibold">Reward: </span>Free drink of your choice
      </div>
    </div>
  );
}

export function LoyaltyMockup() {
  const cards: [string, string, boolean][] = [
    ["Ana Reyes", "7 / 10", false],
    ["Bea Lim", "10 / 10", true],
    ["Mark Tan", "3 / 10", false],
    ["Joey Cruz", "5 / 10", false],
  ];
  return (
    <div className="flex h-full text-[9px] leading-tight">
      <Rail active={4} />
      <div className="flex w-[34%] shrink-0 flex-col gap-1.5 border-r bg-card p-2.5">
        <div className="text-[11px] font-bold">Loyalty cards</div>
        <div className="flex items-center gap-1.5 rounded-[6px] bg-muted px-2 py-1 text-muted-foreground">
          <Search className="size-2.5" /> Username
        </div>
        {cards.map(([n, s, ready], i) => (
          <div
            key={n}
            className={cn("flex items-center justify-between gap-1 rounded-[6px] px-1.5 py-1", i === 0 && "bg-accent")}
          >
            <span className="truncate font-semibold">{n}</span>
            <span className={cn("shrink-0 tabular-nums", ready ? "font-semibold text-primary" : "text-muted-foreground")}>
              {ready ? "Reward" : s}
            </span>
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5">
        <StampCardMockup filled={7} />
        <div className="flex flex-1 flex-col rounded-[8px] bg-card p-2">
          <div className="flex justify-between text-muted-foreground">
            <span>Receipt #0142 · $16.50</span>
            <span className="text-tint-green-foreground">Paid</span>
          </div>
          <div className="relative mt-1 grid flex-1 place-items-center rounded-[6px] border border-dashed">
            <Squiggle i={1} className="h-8 text-foreground" />
            <span className="absolute bottom-1 left-2 text-muted-foreground">Customer signs here</span>
          </div>
          <div className="mt-1.5 rounded-[6px] bg-primary py-1 text-center font-bold text-primary-foreground">
            Give stamp
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReceiptsMockup() {
  const days: [string, [string, string, string, boolean][]][] = [
    [
      "Today · $684.00",
      [
        ["#0142", "9:41 AM · Ana", "$16.50", true],
        ["#0141", "9:36 AM · Ana", "$5.50", false],
        ["#0140", "9:28 AM · Joey", "$10.75", false],
      ],
    ],
    ["Yesterday · $2,147.00", [["#0139", "6:52 PM · Joey", "$4.50", false]]],
  ];
  return (
    <div className="flex h-full text-[9px] leading-tight">
      <Rail active={1} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2.5">
        <div className="text-[11px] font-bold">Receipts</div>
        {days.map(([day, sales]) => (
          <div key={day} className="space-y-1">
            <div className="font-semibold text-muted-foreground">{day}</div>
            {sales.map(([n, meta, total, active]) => (
              <div
                key={n}
                className={cn(
                  "flex items-center gap-1.5 rounded-[6px] bg-card px-1.5 py-1",
                  active && "ring-1 ring-primary/50",
                )}
              >
                <span className="grid size-4 shrink-0 place-items-center rounded-[4px] bg-muted">
                  <Receipt className="size-2.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{n}</span>
                  <span className="block truncate text-muted-foreground">{meta}</span>
                </span>
                <span className="font-semibold">{total}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex w-[42%] shrink-0 flex-col gap-1.5 border-l bg-card/60 p-2.5">
        <div className="min-h-0 flex-1 overflow-hidden rounded-[6px] bg-card p-2 font-mono text-[7.5px] whitespace-nowrap shadow-sm">
          <div className="truncate text-center font-sans text-[9px] font-bold">Corner Cup Coffee</div>
          <div className="truncate text-center text-muted-foreground">Receipt #0142 · 9:41 AM</div>
          <div className="my-1 border-t border-dashed" />
          {[
            ["2 × Spanish latte", "$10.50"],
            ["1 × Croissant", "$3.75"],
            ["1 × Choco cookie", "$2.25"],
          ].map(([n, p]) => (
            <div key={n} className="flex justify-between gap-1">
              <span className="min-w-0 truncate">{n}</span>
              <span>{p}</span>
            </div>
          ))}
          <div className="my-1 border-t border-dashed" />
          <div className="flex justify-between gap-1 text-muted-foreground">
            <span className="min-w-0 truncate">Tax 10% (incl.)</span>
            <span>$1.50</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>$16.50</span>
          </div>
          <div className="flex justify-between gap-1 text-muted-foreground">
            <span className="min-w-0 truncate">PayPal · 8891234</span>
            <span>$16.50</span>
          </div>
          <div className="mt-1 truncate text-center text-muted-foreground">Thank you, see you again!</div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-1 whitespace-nowrap">
          <span className="flex items-center justify-center gap-1 rounded-[6px] bg-primary py-1 font-bold text-primary-foreground">
            <Printer className="size-2.5" /> Print
          </span>
          <span className="flex items-center justify-center gap-1 rounded-[6px] border bg-card py-1 font-semibold">
            <Link2 className="size-2.5" /> <span className="hidden sm:inline">Customer</span> link
          </span>
        </div>
      </div>
    </div>
  );
}
