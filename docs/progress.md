# Progress

Update this at the end of every session: tick what's done, note decisions and open questions.

## Current status

**Week 3 (inventory and costing) is built (2026-09-14)**, and every open follow-up from Weeks 1 and 2 that didn't need you is done (below).
- **Checks:** `npm test` (102 tests), `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass. Everything is deployed to the cloud dev deployment.
- **Security review of Week 3:** no critical or high findings. Both medium and both low items are fixed, and the missing negative tests were added.

**What Week 3 added:**
- **Stock items** (`convex/inventory.ts`): list, detail with "used by", create, edit, and delete only when nothing refers to the item. Base unit (g, ml, pc) with an optional purchase unit (1 L carton = 1,000 ml).
- **Receiving:** one delivery with several lines. Each line takes a quantity in base or purchase units and the total cost from the supplier's receipt; the unit cost and the weighted average are worked out on the server.
- **Waste, adjust and stock count:**
  - Any role can log waste, but cashiers can't log more than is on hand. Owners and managers adjust and count.
  - The count saves every counted item in one mutation and compares with on-hand stock when saved, so sales during the count aren't lost.
- **Ledger:** every change goes through `recordMovement` (`convex/lib/stock.ts`), which writes a `stockMovements` row and moves `onHand` with it. Quantities keep 3 decimals so the ledger adds up exactly. Each item's sheet shows its history (who, what, when, note).
- **Recipes** save with their product (`products.create`/`update` take `recipe`), so a product and its cost never disagree. The product sheet has a recipe editor with live cost, margin and a "Use ₱155.00 for a 60% margin" suggested price.
- **Modifier options** now edit their recipe changes (Large: +60 ml milk; negative amounts allowed).
- **Background recosting** (`convex/costing.ts`):
  - A receipt that changes an average cost schedules a recost of every product that uses the item, one stock item and 50 recipe lines per run.
  - Changing the target margin or tax settings re-flags every product.
  - Products carry `belowTargetMargin` with an index, ready for the Week 6 alerts.
- **Screens:**
  - Inventory in the rail, for all roles (cashiers see stock but no costs), with a "Needs attention" tab for low, out and below-zero items.
  - An item sheet, receive sheet, waste and adjust dialogs, and an item form.
  - `/[shop]/inventory/count`, where Enter jumps to the next item.
- **On the cloud dev deployment:**
  - Receiving milk at a higher price moved the iced latte's cost from ₱50.40 to ₱53.92 **in 1.4 seconds** and flagged it below target.
  - A stock count saved through the UI.
  - Screens were checked in headless Chrome at 1440, 1024 and 390 px with no console errors.

**Follow-ups finished on 2026-09-14:**
- **Sign-in rate limiting (was medium).**
  - Convex's edge replaces `x-forwarded-for` with the caller, so behind the Next.js proxy every sign-in looked like one visitor. The proxy (`app/api/auth/[...all]/route.ts`) now signs the browser's IP with `AUTH_PROXY_SECRET`.
  - `convex/http.ts` trusts that IP only with a valid signature; otherwise it uses the address that called it. It registers the auth routes itself to do this.
  - Limits: 10 sign-ins per 5 minutes and 10 sign-ups per hour per visitor, stored in the database.
  - Verified on dev: 10 bad sign-ins return 401 and the 11th returns 429. Another visitor still signs in, and forged IP headers sent straight to Convex are ignored.
- **Photos tied to their shop (was low).**
  - New `uploads` table, and `products.claimUpload` after each upload (it does the type and size check). A product only accepts a photo its shop claimed.
  - A daily cron (`convex/photos.ts`, 3 am Manila) deletes photos no product uses, once a day old.
  - `photos:claimExisting` backfilled the 2 existing photos on dev.
  - `imageId` is still sent to owners and managers; with claims it can't be used by another shop.
- **Security headers (was low):** a CSP without nonces that allows only this app and its Convex deployment, `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy` and `Permissions-Policy` in `next.config.ts`. Checked for violations on every main screen, forms and a photo upload.
- **Shops per account (was low):** one account can own up to 5 shops.
- **Lint gap:** `queryGeneric`, `mutationGeneric` and `actionGeneric` are blocked in `convex/`.
- **PWA icons (Week 1):** 192 and 512 px, maskable, Apple touch and tab icons, rendered from the rail's Store logo.
- **CSV row numbers** now match the spreadsheet, even with blank lines or multi-line cells.
- **Week 2 click-throughs:**
  - A product with a photo was added through the UI.
  - A modifier's recipe change was saved and restored.
  - A **300-row CSV** imported through the UI in 4 seconds: 297 created, and the 3 bad rows were reported at their exact spreadsheet rows.
  - Phone and tablet layouts were checked.
- **UI fixes:**
  - The Select's built-in height and the Sheet's built-in width outranked the classes passed in (this project's `cn` doesn't merge classes), so selects were 32 px and sheets never went full width on phones. Added `size="lg"` to Select and `w-full!` on sheets.
  - The product sheet overflowed on phones.
  - Garbled `₱` and `…` characters in the modifiers page were repaired.

**Dev data:** the smoke user `smoke+1789243401@example.com` owns `smokemtytcb0x` (café with opening stock, waste, a count, a milk price rise and a photo product) and `smokegrocery` (297 imported products).

**Needs you:**
- **Before any production deploy:** set `AUTH_PROXY_SECRET` to the same random value in Vercel and in the production Convex deployment (`openssl rand -base64 32`). Without it, sign-in limits apply to the Next.js server's address instead of each visitor. It's already set on dev and in `.env.local`.
- **Before pilots:** a Resend API key and sending domain, so email verification can be turned on.

**Next up:** Week 4, the checkout screen and `sales.checkout`. The POS UI already exists. Remember that checkout must clamp line totals at zero or above (modifier price changes can be negative) and cap quantities.

### Open questions
- Development runs on the **cloud dev deployment** `dev:judicious-porcupine-20` (team anthony-333, project payspace).
- `components/convex-client-provider.tsx` casts `authClient`: `@convex-dev/better-auth` 0.12.5 is typed against `better-auth` 1.6.15, and 1.6.31's session type no longer matches. Remove the cast when the component updates.
- Email verification is off (`requireEmailVerification: false`) until Resend is wired up. It must be on before pilots.
- `modifiers.list` returns option recipe amounts to cashiers (the POS needs the options). They're quantities, not costs; revisit if recipes become sensitive.
- Sign-in is limited per visitor, not per account, so a guesser spread across many IPs isn't slowed. Consider a per-email limit before launch.
- The CSP allows `'unsafe-inline'` scripts because Next.js needs them without nonces. Nonces would make every page dynamic; revisit if a stricter policy is needed.

## Roadmap

### Week 1: Foundation and tenancy
- [x] Next.js app (TypeScript, Tailwind, shadcn/ui with the Nova preset and Radix), PWA manifest and icons
- [x] Better Auth (email and password) through `@convex-dev/better-auth`; sign-in and sign-up pages; `proxy.ts` redirect
- [x] Convex schema from `docs/mvp-plan.md`
- [x] `tenantQuery`, `tenantMutation`, `userQuery`, `userMutation`, `requireRole`, `getOwned`; lint rule against raw `query`/`mutation`
- [x] Onboarding: `tenants.create` (business + owner member in one transaction), type, currency, tax; shop-slug routing (`app/[shop]`)
- [x] Categories list/create/rename, pulled forward so `getOwned` is tested against a real table
- [x] **Tests:** shop A can't list, read or edit shop B's data through any function (`convex/tenancy.test.ts`)

### Week 2: Products and catalog
- [x] Categories (reorder, delete when empty), products, modifier groups, images, barcodes (unique per shop), search, archive
- [x] Business templates (café, grocery, bakery), from onboarding or the home page
- [x] CSV import with preview and per-row errors
- [x] App shell: sidebar with shop switcher (`app/[shop]/(manage)`)
- [x] **Tests:** catalog behaviour (`convex/catalog.test.ts`), isolation for every new function, money and CSV helpers

### Week 3: Inventory and costing
- [x] Stock items with units, receiving with weighted average cost
- [x] Adjustments, waste, stock counts, ledger
- [x] Recipe editor with live cost and margin; background cost recalculation and margin flags
- [ ] Days of cover per item: moved to Week 6, because it needs sales data
- [x] **Tests:** `convex/inventory.test.ts`, `convex/lib/costing.test.ts`, isolation for every new function

### Week 4: Checkout screen
- [ ] POS page matching `docs/prototypes/pos-checkout.html`
- [ ] `sales.checkout` mutation (server pricing, stock deduction, ledger, stats, idempotent)
- [ ] Printed receipt stylesheet (58 mm and 80 mm)

### Week 5: Shifts and selling operations
- [ ] Open and close shifts with blind count
- [ ] Voids, refunds with manager PIN, parked orders
- [ ] Sales history, digital receipts with QR, retry queue and connection indicator

### Week 6: Dashboard and CSV export
- [ ] KPIs vs same weekday last week, hourly heatmap, top items by revenue and profit, payment mix
- [ ] Stock and margin alerts, date ranges
- [ ] Export pipeline, Exports screen, Export CSV buttons on list pages

### Week 7: Roles, settings and standout features
- [ ] Server-side permission checks everywhere; staff management; tax and receipt settings
- [ ] Reorder list, live order board, daily low-stock email
- [ ] Full backup ZIP, product export/re-import round trip, export log and expiry cron
- [ ] Performance pass on a low-cost Android tablet

### Week 8: Pilot and launch
- [ ] Production Convex, Vercel, Sentry, PostHog, scheduled backups; email verification on
- [ ] Onboard 3 to 5 pilot shops

## Backlog (before a real launch)
- [ ] Camera barcode scanning (`BarcodeDetector`, maybe `@zxing/browser`). Deferred on 2026-09-13; USB scanners work today.
- [x] Clean up orphaned product photos in file storage (daily cron, 2026-09-14)
- [ ] Senior Citizen / PWD discount: 20% off the VAT-exclusive price, VAT-exempt, applies only to the qualifying customer's items; needs ID number on the sale and its own receipt lines
- [ ] Check BIR requirements for POS registration/accreditation, invoice format, X and Z readings
- [ ] Fast PIN switching between cashiers on a shared tablet

## Decisions log
- 2026-09-12: **Clerk replaced with Better Auth** via `@convex-dev/better-auth`, used for sign-in only. Businesses, staff and roles live in our own Convex `tenants` and `members` tables, not in Better Auth's organization plugin (which would need a "local install" schema). This means no webhooks, no svix and no paid role add-on. `members.userId` is the Better Auth user ID (`identity.subject`).
- 2026-09-12: Version pins: `better-auth@~1.6.x` (the component requires `<1.7`) and `vitest@^4` (better-auth's peer range).
- 2026-09-12: Indexes that didn't start with `tenantId` in the spec (`products.by_stock_item`, `recipeLines.by_product`, `recipeLines.by_stock_item`) now do. Global lookups stay: `tenants.by_slug`, `members.by_user`, `sales.by_receipt_token`, `exports.by_expires`.
- 2026-09-12: Staff invites (our own `invites` table, Resend email, accept page) are built in Week 7 with staff management.
- 2026-09-12: `@hookform/resolvers` is pinned at 5.2.2. Newer 5.x releases list `@typeschema/main` as an optional peer, and npm resolves it to Zod 3, which conflicts with Zod 4.
- 2026-09-12: shadcn/ui set up with the Nova preset on Radix. It uses shadcn's own `cn` package in place of `clsx` and `tailwind-merge`.
- 2026-09-12: `@convex-dev/agent`, `ai` and `@ai-sdk/anthropic` approved for the Version 1.1 "Ask your shop" assistant; setup notes in `docs/setup/convex-agent.md`.
- 2026-09-13: **Camera barcode scanning deferred.** Barcode fields accept typing and USB scanners for now.
- 2026-09-13: **Toasts use `sonner`** through shadcn's wrapper, fixed to the light theme so `next-themes` isn't needed. Removed the unused `@better-auth/infra` dependency.
- 2026-09-13: **A stocked product creates its own stock item** (base unit `pc`, 0 on hand). The name stays in step unless the stock item was renamed.
- 2026-09-13: **Cashiers can read products, but `unitCost` comes back as `null`** for them; only owners and managers see cost and margin.
- 2026-09-13: **Barcodes are unique per shop, including archived products,** so restoring a product never causes a clash.
- 2026-09-13: **Deleting a modifier group is allowed,** because sales snapshot option names. Products skip the missing ID and drop it the next time they're saved.
- 2026-09-13: **Templates seed ingredients and recipe lines now** (0 on hand, no ledger rows) and cache each recipe product's `unitCost`. The recipe editor comes in Week 3. `templates.apply` is owner-only and only runs on an empty catalog.
- 2026-09-13: **CSV import is validated twice.** The browser parses and checks rows (shared rules in `convex/lib/catalog.ts`), then sends batches of 100; `products.importBatch` checks every row again and returns per-row errors. The parser is hand-written (`convex/lib/csv.ts`), with no dependency.
- 2026-09-13: **Added the `products.by_tenant_active_category` index** for the category filter and the empty-category check.
- 2026-09-13: **Photos are resized in the browser** to 512 px WebP (JPEG as a fallback). The server accepts only `image/*` files up to 1 MB.
- 2026-09-13: **Visual design comes from `docs/design/blueprint.md`** (reference image `docs/design/pos-reference.png`); the `ui-ux-designer` agent and CLAUDE.md point to it. `docs/prototypes/pos-checkout.html` still defines checkout behaviour. The design was adapted for PH: ₱, VAT included, Cash / E-wallet / Card instead of Paylater, and no language flags or notifications.
- 2026-09-13: **The POS screen UI was pulled forward from Week 4, without the checkout mutation.**
  - The cart uses `zustand` (in the approved stack), persisted to `localStorage` per shop and rehydrated after mount. The plan's IndexedDB would need another package; decide on it with the Week 5 retry queue.
  - Cart lines store only the product, option refs and quantity. Names and prices are read from the live catalog for display, and checkout will price on the server.
- 2026-09-13: **Added `products.forSale`**, which returns active products for the POS without costs, and `taxBreakdown` in `convex/lib/money.ts` (VAT rounded once per order).
- 2026-09-13: **Replaced shadcn's `sidebar` component** with a custom icon rail (`components/shop/app-shell.tsx`). The top-bar search is shared through `useShellSearch` on the POS and Products pages.
- 2026-09-14: **A stock item's cost is locked once stock is received.** Before the first delivery, the cost typed on a stocked product or stock item sets `avgCost`; after it (`stockItems.lastReceivedAt` is set), only receiving changes it, and both mutations refuse a different cost.
- 2026-09-14: **Recipes are saved with their product** (`recipe` on `products.create`/`update`) rather than through a separate mutation, so the lines and the cached `unitCost` change in one transaction. `recipes.forProduct` reads them back (owner and manager).
- 2026-09-14: **Added `products.belowTargetMargin` and the `by_tenant_below_margin` index**, kept in step on every product save, recost and margin-setting change. Added `stockItems.lastReceivedAt`.
- 2026-09-14: **Quantities keep 3 decimals and average costs 4 decimals of a centavo** (`convex/lib/quantity.ts`, `roundAvgCost`). Anything a product or sale stores is still whole centavos.
- 2026-09-14: **A stock count compares with on-hand stock when it's saved**, not when it started, and blank rows are skipped. Only unused stock items can be deleted (no ledger rows, products, recipes or modifier options).
- 2026-09-14: **Suppliers stay unused this week**; a receipt has an optional note instead. Days of cover moved to Week 6.
- 2026-09-14: **Suggested price** is the lowest ₱5 step that meets the target margin, with VAT added when prices include it (`suggestedPrice` in `convex/lib/costing.ts`).
- 2026-09-14: **Background jobs do bounded work per run and reschedule the rest** (one stock item and 50 recipe lines, or 50 products), after the security review found the first version could exceed transaction read limits.
- 2026-09-14: **Cashiers can't log more waste than is on hand**; bigger write-offs go through a manager. Costs per unit above ₱10M are refused, and cached product costs are capped there. A shop can have at most 200 modifier groups.
- 2026-09-14: **Auth routes are registered in `convex/http.ts` instead of `authComponent.registerRoutes`,** so the client IP can be settled before Better Auth's rate limiter reads it. Keep the forwarded host/proto handling in step with the component when it updates.
- 2026-09-14: **New env var `AUTH_PROXY_SECRET`** (Next.js and Convex, same value) signs the client IP the auth proxy passes on.
- 2026-09-14: **Photos are claimed in an `uploads` table.** It has a global `by_storage` index, because a file belongs to exactly one shop and the cleanup job looks files up without a shop. Unclaimed files are only deleted when they're images, so files other features store (exports) are safe. Added `products.by_tenant_image` for the cleanup check.
- 2026-09-14: **Zod runs without its JIT** (`lib/zod-config.ts`), because its `new Function` probe reports a CSP violation.
- 2026-09-14: **One account can own up to 5 shops.** Being staff elsewhere doesn't count.
