# Design blueprint

There are three references. Open them before designing or reviewing UI:
- **`docs/design/coca-reference-1.png` to `-5.png`** (the Dribbble "Coca POS" landing page, adopted 2026-09-27) set the brand: the orange, dark hero cards, pastel panels, pill buttons, icon chips and large rounded corners. The landing page (`app/(marketing)`) follows them closely.
- **`docs/design/pos-reference.png`**, a "front cashier" menu screen, sets the **layout** of the app screens: the rail, top bar, category tiles, product cards and invoice panel. Its blue is superseded by the Coca orange.
- **`docs/prototypes/pos-checkout.html` sets how checkout behaves:** quick-tender buttons, change, split payments and pricing logic.

When they disagree, Coca wins on colour and component style, the cashier image wins on screen layout, and the prototype wins on behaviour.

## Overall feel

Calm and bright, with a warm accent. In the app, everything sits on white cards over a light gray page; the landing and sign-in pages sit on white with soft gray panels (`.page-white`). One orange marks actions and selection, near-black marks where you are (the active nav pill, dark hero and lead stat cards), and pastel tints carry status and secondary stats. Food photos add the rest of the colour. Corners are large, shadows are barely there, and there are no heavy borders or gradients.

## Tokens

The tokens live in `app/globals.css`. Use them through Tailwind classes such as `bg-primary`, `text-muted-foreground` and `bg-card`. Never hard-code colors in components.

| Role | Value | Used for |
|---|---|---|
| Page background (`--background`) | #F4F5F7 | Everything behind the cards |
| Card (`--card`) | #FFFFFF | Tiles, product cards, invoice panel, top bar, rail |
| Primary (`--primary`) | #C2410C | Buttons, active category tile, + button, Place order, selected payment method |
| Brand (`--brand`) | #FF6A13 | Decoration only: chart bars, glows, the logo tile on dark. Never text on white |
| Primary soft (`--accent`) | #FFF1E8 | Selected payment tab, hovered tile, icon wells, with #A8420C text |
| Dark card | `bg-foreground text-background` | Dashboard welcome card, the lead KPI tile, the sign-in side panel, the active nav pill |
| Tints (`--tint-green/blue/violet/peach`) | pastels, each with a `-foreground` that passes AA on it | Stat tiles, pricing columns, testimonials, callouts |
| Text (`--foreground`) | #1A1D23 | Titles, prices |
| Secondary text (`--muted-foreground`) | #858B95 | Descriptions, "12 items", labels, currency sign |
| Hairline (`--border`) | #ECEEF2 | Card outlines, the dashed divider in the summary |
| Soft panel (`--muted`) | #F7F8FA | Payment summary box, search field, stepper buttons |
| Danger (`--destructive`) | red | Sign out icon, errors |

The primary is darker than Coca's #FF6A13 so white text on it passes WCAG AA (5.2:1), and orange text still passes on the pale panels (4.7:1 on the accent).

- **Radius:** `--radius` is 16px, so cards and tiles (`rounded-xl`) are about 22px, inputs (`rounded-lg`) 16px, and hero cards (`rounded-2xl`) about 29px. Every button, nav item, search field and chip is a full pill (`rounded-full`).
- **Icon chips:** a card title can be a pill holding a 28px dark circle with the icon, then the label (see the KPI tiles), as in Coca's "Sales Statistics".
- **Charts:** slot 1 is the brand orange, then blue and aqua; the heatmap is an orange ramp. Both were validated with the dataviz method (see the comment in `app/globals.css`).
- **Shadow:** at most `shadow-xs` on cards; the active tile has none. Depth comes from white on gray.
- **Type:** Plus Jakarta Sans (via `next/font`) for everything.

| Style | Size and weight | Where |
|---|---|---|
| Section title | 24px, semibold | "Lunch Menu", "Invoice" |
| Card title | 16px, semibold | Product and tile names |
| Body | 14px, regular | Descriptions and labels |
| Caption | 12–13px, muted | Item counts, option text, role under the name |
| Price | 24px, semibold, tabular | Product card prices; the ₱ sign is muted and lighter |

## Layout

The screen is split like this:

| Rail (80px) | Content | Invoice (380px) |
|---|---|---|
| Logo, nav icons, then help and sign out at the bottom | Top bar (search, profile), category tiles, section title, product grid | Lines, payment summary, payment tabs, Place order |

The rail runs the full height. The top bar spans both the content and the invoice columns.

- **Rail:** white and 80px wide, with the logo (an orange rounded square) at the top.
  - Nav items are 48px round icon buttons. The active item is a near-black circle with a white icon; the others are muted icons. Each has a tooltip with its label.
  - The bottom holds the shop switcher and sign out (in red).
  - On phones, the rail becomes a slide-out sheet with labels, opened from a menu button in the top bar.
- **Top bar:** white and 72px tall.
  - A wide soft-gray pill search field with a leading search icon on the left.
  - On the right, a round avatar, the person's name (semibold) and a caption line (role and shop).
  - It shows search only on screens that use it (POS, products).
- **Content:** 24px padding, with a 16–20px gap between cards.
- **Invoice panel:** a white card with a 24px inset, full height, and its own scrolling list of lines.
  - The payment summary and Place order button stay pinned at the bottom.
  - Below `lg` it collapses into a bottom bar ("3 items · ₱423.00 · View order") that opens a sheet.

## Components

- **Category tile:** a white card about 72px tall with a 40px icon well on the left, the name in semibold and the item count as a caption.
  - When active, the whole tile is primary with white text, and the icon well turns white with a primary icon.
  - Tiles form a grid of 4 across on desktop, 2 on tablet portrait, and a horizontal scroll row on phones.
  - An "All" tile comes first.
- **Product card:** a white card with 12px padding.
  - An 80px rounded square photo sits on the left, with the name (semibold) and a two-line muted description on the right.
  - The bottom row has the price on the left and a stepper on the right: a circular −, the count, and a circular +. The + is solid primary once the count is above 0, otherwise it's an outline.
  - Products without a photo show a soft icon well with the first letter.
- **Invoice line:** a 64px rounded photo, the name (semibold), "2×" and the option text (muted) below it, and the line total right-aligned at the bottom.
- **Payment summary:** a soft-gray rounded box with a "Payment summary" title, label and value rows, a dashed divider, then the total row.
- **Payment method tabs:** three equal segments in a white pill on the soft box, each an icon above a label. The selected segment is white on a soft-primary background with primary text.
- **Primary action:** a full-width, 52px, primary button with a bold label.

## Adapting the image to this product

| In the image | In Payspace |
|---|---|
| `$50.5` | `₱50.50`, formatted with `formatMoney` from `convex/lib/money.ts` |
| "12 Menu In Stock" | "12 items". Stock counts come with inventory |
| Credit Card / Paylater / Cash Payout | Cash / E-wallet (GCash, Maya) / Card |
| Sub Total + Tax + Total | Subtotal, "VAT (included)" and Total when prices include VAT, which is the default; otherwise VAT is added |
| "Dont Add Vegetables" | The chosen modifier options, like "Large · Oat milk" |
| Lorem descriptions | The product's modifier groups ("Size, Milk, Add-ons") or its category |
| Language flags, notifications bell | Not in the MVP |
| "Casher 1st Shift" | Role and shop ("Owner · Brew Lab"); the shift name once shifts exist |
| "Place An Order" | "Place order" |

## Rules that still apply

The rules in `.claude/agents/ui-ux-designer.md` still apply:
- 48px tap targets
- the barcode field keeps focus on the POS
- role-aware UI
- money only as integer centavos through the helper
- AA contrast
- a keyboard path through checkout
