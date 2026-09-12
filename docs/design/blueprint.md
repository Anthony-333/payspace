# Design blueprint

The visual reference for every screen is `docs/design/pos-reference.png`, a "front cashier" menu screen. Open it before designing or reviewing UI.

The two references cover different things:
- **The image sets how the app looks:** layout, spacing, type, color and components.
- **`docs/prototypes/pos-checkout.html` sets how checkout behaves:** quick-tender buttons, change, split payments and pricing logic.

When they disagree, the image wins on looks and the prototype wins on behaviour.

## Overall feel

Calm and bright. Everything sits on white cards over a light gray page. One saturated blue marks what's active or primary, and everything else is neutral. Food photos add the color. Corners are generous, shadows are barely there, and there are no heavy borders or gradients.

## Tokens

The tokens live in `app/globals.css`. Use them through Tailwind classes such as `bg-primary`, `text-muted-foreground` and `bg-card`. Never hard-code colors in components.

| Role | Value | Used for |
|---|---|---|
| Page background (`--background`) | #F4F5F7 | Everything behind the cards |
| Card (`--card`) | #FFFFFF | Tiles, product cards, invoice panel, top bar, rail |
| Primary (`--primary`) | #2D62EA | Active tile, active rail item, + button, Place order, selected payment method |
| Primary soft (`--accent`) | #EAF0FE | Selected payment tab, hovered tile, icon wells |
| Text (`--foreground`) | #1A1D23 | Titles, prices |
| Secondary text (`--muted-foreground`) | #858B95 | Descriptions, "12 items", labels, currency sign |
| Hairline (`--border`) | #ECEEF2 | Card outlines, the dashed divider in the summary |
| Soft panel (`--muted`) | #F7F8FA | Payment summary box, search field, stepper buttons |
| Danger (`--destructive`) | red | Sign out icon, errors |

The primary is a touch darker than the image's blue so white text on it passes WCAG AA (4.5:1).

- **Radius:** 12px for cards and tiles (`rounded-xl`), 10px for inputs and buttons, and full circles for the stepper buttons.
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

- **Rail:** white and 80px wide, with the logo (a blue rounded square) at the top.
  - Nav items are 48px icon buttons. The active item is a blue square with a white icon; the others are muted icons. Each has a tooltip with its label.
  - The bottom holds the shop switcher and sign out (in red).
  - On phones, the rail becomes a slide-out sheet with labels, opened from a menu button in the top bar.
- **Top bar:** white and 72px tall.
  - A wide soft-gray search field with a leading search icon on the left.
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
