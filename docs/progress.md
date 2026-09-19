# Progress

Update this at the end of every session: tick what's done, note decisions and open questions.

## Current status

**A VAT switch and navigation feedback, asked for directly (2026-09-19).** Two things you raised: owners can now turn VAT off, and tapping a rail item answers straight away instead of looking frozen.
- **Checks:** `npm test` (139 tests, 3 new), `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass. **Not clicked through in a browser** — local sign-in is still refused by the dev deployment's `SITE_URL` (see "Needs you").
- **Settings screen** at `/[shop]/settings` (`components/shop/settings-page.tsx`), owner-only in the rail and on the server. It holds a **Charge VAT** switch, the rate, **Prices include VAT**, and a live worked example on a ₱100 item. This is the first slice of Week 7's "tax and receipt settings".
- **VAT off is stored as a 0% rate**, not a second flag, so there is still only one answer to what a shop charges (rule 6). Saving re-flags every product's margin in the background, and the checkout picks it up live.
  - The cost: switching VAT off forgets the old rate. Switching it back on offers 12% in a field you have to confirm before saving, so nothing changes silently. Say the word if you'd rather it remembered.
- **Receipts now describe their own VAT.** `sales.byToken` no longer sends the shop's current tax settings, and `taxFromTotals()` (`convex/lib/money.ts`) reads the rate and "(incl.)" back out of the sale's own subtotal, tax and total. A receipt handed over while VAT was on keeps its VAT line afterwards — before this, turning VAT off would have quietly erased the VAT line from every past receipt while the amount stayed in the total (rule 7).
- **Navigation feedback:** `loading.tsx` for the back-office routes and a second one shaped like the checkout screen, so the new page paints a skeleton instead of the old screen sitting frozen. On top of that, the tapped rail item's icon becomes a spinner and a sliver of progress runs across the top (`useLinkStatus`, `NavIcon` in `app-shell.tsx`). Both hints are held back 140 ms (`.nav-hint` in `app/globals.css`) so a prefetched route never flashes one, and both collapse under `prefers-reduced-motion`.

**Week 6's analytics was brought forward and wired up (2026-09-18).** The Analytics page and the Dashboard KPIs were layout-only shells with hardcoded zeros; they now read the rollups checkout writes, live.
- **Checks:** `npm test` (136 tests, 14 new for analytics), `npx tsc --noEmit`, `npm run lint`, `npm run build`, and a visual pass at 1440, 1024 and 390 px in light and dark with no console errors.
- **`convex/analytics.ts`** (owner and manager only, every one reading rollups rather than raw sales): `summary` (KPIs, the hourly pattern, the payment mix and an hour-by-weekday grid, each against the same span a week earlier), `topProducts` (top 10 by revenue and by profit), `alerts` (stock needing attention, products under the target margin) and `forProduct`.
- **Ranges** are today / 7 / 30 / custom, worked out in the shop's timezone. `summary` takes up to 366 days; `topProducts` is capped at 31, because it reads a row per product per day.
- **Charts** follow the `dataviz` skill: the form is chosen by the data's job and colour comes last. Magnitude uses one hue (bars for hours and top items); categorical is used only for the payment mix, where the series are the subject; the weekday heatmap uses a sequential ramp because there colour *is* the value. Every chart has a table view, and the palette was checked with the skill's validator in both modes rather than by eye.
- **New chart tokens** in `app/globals.css` (`--viz-*`), replacing the unused shadcn `--chart-*` defaults, which failed the lightness band.
- Left for the rest of Week 6: the export pipeline, the Exports screen and days-of-cover.

**Week 4 (checkout) is built (2026-09-18).** "Place order" now rings up a real sale: the server prices the order, deducts stock through the ledger, updates the rollups and issues a receipt that stays readable at `/r/[token]` for good.
- **Checks:** `npm test` (122 tests, 13 of them new for checkout and 7 for the business date), `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass, and the functions are deployed to the cloud dev deployment.
- **Not yet clicked through by me:** local sign-in is refused because the dev deployment's `SITE_URL` is `https://www.payspace.shop`, and `convex/auth.ts` takes its only trusted origin from that. See "Needs you". An already-signed-in browser still works, because Convex calls carry a JWT and don't go through Better Auth's origin check — which is how the first UI bug below was found.
- **Found from the UI and fixed:** Complete sale did nothing, silently, for a cart saved on the device before checkout existed (no `clientRef`). Fixed, along with the double-mounted payment sheet. Both are in the decisions log. Still wants a clean click-through end to end.

**What Week 4 added:**
- **`sales.checkout`** (`convex/sales.ts`), one transaction: it returns the original sale for a repeated `clientRef`, prices every line from the live catalog, takes the sold ingredients off the shelf through `stockMovements`, bumps `dailyStats` and `productDailyStats`, and takes the next number from `counters`.
- **Server pricing** (`convex/lib/sale.ts`): the client sends product IDs, quantities and option refs only. Options are re-checked against the live modifier groups (offered by that product, still exists, min and max respected), a negative modifier can never take a line below zero, quantities are capped at 999 and archived products are refused.
- **Payments:** cash, e-wallet and card, split up to 5 ways. Only cash may overpay, and the excess is the change; an e-wallet or card that overpays is a typo, so it's refused. The e-wallet provider is kept in the payment's `ref` ("GCash 8891234"), the only field the schema has for it.
- **`clientRef`** is made when the order is started and kept in the persisted cart, so a double tap or a retry after a dropped connection returns the first sale instead of ringing it up twice.
- **Business dates** (`convex/lib/businessDate.ts`): every sale and rollup is keyed by the shop's own calendar day, so a sale rung at 00:30 in Manila counts for that Manila date.
- **Screens:** the payment sheet (`components/pos/pay-sheet.tsx`) with quick tender, keypad, split payments and live change, following `docs/prototypes/pos-checkout.html`; a Receipts page in the rail; and the public receipt at `/r/[token]`, with a print stylesheet for 58 mm and 80 mm rolls.

**Week 3 (inventory and costing) was built (2026-09-14)**, and every open follow-up from Weeks 1 and 2 that didn't need you is done (below).
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
- **To click through anything locally** (raised 2026-09-18, and you chose to leave it for now): the dev deployment's `SITE_URL` is `https://www.payspace.shop`. `convex/auth.ts` passes it as Better Auth's `baseURL` and sets no `trustedOrigins`, so it is the only origin trusted, and signing in or up at `http://localhost:3000` returns 403 "Invalid origin". Either set it back (`npx convex env set SITE_URL http://localhost:3000`) while developing, or add localhost to `trustedOrigins` for dev deployments only. It was left alone because production may still be served off this dev deployment, where flipping it would break sign-in. The same 403 is also what makes the recorded smoke sign-in look like a wrong password — those credentials are probably fine.
- **Before any production deploy:** set `AUTH_PROXY_SECRET` to the same random value in Vercel and in the production Convex deployment (`openssl rand -base64 32`). Without it, sign-in limits apply to the Next.js server's address instead of each visitor. It's already set on dev and in `.env.local`.
- **Before pilots:** a Resend API key and sending domain, so email verification can be turned on.

**Next up:** Week 5, shifts and selling operations. Checkout already opens a shift for the cashier on their first sale (float ₱0) and every sale points at a real one, so Week 5 adds opening with a float and closing with a blind count on top, plus voids, refunds with the manager PIN, parked orders, and the discounts held back from Week 4.

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
- [x] POS page matching `docs/prototypes/pos-checkout.html`
- [x] `sales.checkout` mutation (server pricing, stock deduction, ledger, stats, idempotent)
- [x] Printed receipt stylesheet (58 mm and 80 mm)
- [x] Digital receipts, saved and readable at `/r/[token]`, with a Receipts page in the shop
- [ ] Discounts (line and order): moved to Week 5, so they land with the manager PIN that authorises them
- [ ] Click-through in a browser: blocked on the `SITE_URL` question below
- [x] **Tests:** `convex/sales.test.ts`, `convex/lib/businessDate.test.ts`, isolation for every new function

### Week 5: Shifts and selling operations
- [ ] Open and close shifts with blind count
- [ ] Voids, refunds with manager PIN, parked orders
- [ ] Sales history, digital receipts with QR, retry queue and connection indicator

### Week 6: Dashboard and CSV export
- [x] KPIs vs same weekday last week, hourly heatmap, top items by revenue and profit, payment mix *(brought forward to 2026-09-18)*
- [x] Stock and margin alerts, date ranges
- [ ] Days of cover per item (moved here from Week 3)
- [ ] Export pipeline, Exports screen, Export CSV buttons on list pages

### Week 7: Roles, settings and standout features
- [ ] Server-side permission checks everywhere; staff management; tax and receipt settings *(the Settings screen and the VAT switch are done, 2026-09-19; staff and receipt settings are still to come)*
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
- 2026-09-16: **The auth route rebuilds the incoming request instead of cloning it.** Next hands route handlers a `Proxy` around the request to track dynamic access, and the undici that ships with Node 24 (which Vercel runs) keeps a `Request`'s internals in a private `#state` field. A Proxy can't forward private fields, so `new Request(request, { headers })` — and the component's own `request.arrayBuffer()` — threw `Cannot read private member #state` in production while Node 22 locally was fine. `app/api/auth/[...all]/route.ts` now reads `url`, `method`, `headers` and `body` off the proxy (property reads are safe) and builds a plain `Request` with `duplex: "half"`, on every request rather than only when `AUTH_PROXY_SECRET` is set.
- 2026-09-16: **Production was running against the dev Convex deployment.** The live site's CSP was built from `judicious-porcupine-20`, whose `SITE_URL` is `http://localhost:3000`; Better Auth derives its trusted origins from `baseURL`, so every signed-in POST from `https://www.payspace.shop` was refused with `INVALID_ORIGIN` (403). `opulent-emu-504` had never been deployed to and had no environment variables. It now has `SITE_URL=https://www.payspace.shop` (the canonical host — the apex 308-redirects to www), a real `BETTER_AUTH_SECRET` and an `AUTH_PROXY_SECRET`, and the functions are deployed. Vercel still has to be repointed at it by hand.
- 2026-09-16: **`BETTER_AUTH_SECRET` on the dev deployment is the literal string `$(openssl rand -base64 32)`** — the substitution never ran when it was first set, so a guessable placeholder has been signing sessions. Rotated on 2026-09-16 from Git Bash, where the substitution expands. Prod has its own separate secret.
- 2026-09-18: **Checkout opens a shift for the cashier on their first sale** (float ₱0), rather than making `sales.shiftId` optional. Every sale points at a real shift from day one, so Week 5 only adds opening with a float and closing with a blind count, and nothing needs backfilling.
- 2026-09-18: **Discounts were held back to Week 5.** The schema fields are written as 0. They need the manager PIN that authorises anything over `discountLimitBps`, and that same PIN machinery is what voids and refunds need, so they land together.
- 2026-09-18: **Only cash may overpay.** The excess becomes `changeGiven`; an e-wallet or card payment above the amount due is refused as a typo rather than recorded as a tip.
- 2026-09-18: **The e-wallet provider lives in the payment's `ref`** ("GCash 8891234"), because `sales.payments` has only `method`, `amount` and `ref`. If the payment mix ever needs GCash apart from Maya, that needs a schema change.
- 2026-09-18: **Added `businessMoment`/`businessDate` (`convex/lib/businessDate.ts`)**, used for `sales.businessDate` and the `dailyStats.byHour` bucket. An unrecognised timezone falls back to UTC rather than failing the sale.
- 2026-09-18: **Added `publicQuery` to `convex/lib/tenant.ts`** for the public receipt, so that file stays the only one importing the raw `query` (CLAUDE.md rule 1). It is only for routes where an unguessable token is the key, and `sales.byToken` returns no cost, member or internal ID.
- 2026-09-18: **Stock is deducted once per stock item per sale**, not once per line, so three lattes on one order write one movement for the beans. Stock is still allowed to go negative, and flagged.
- 2026-09-18: **Checkout asks the cart for a `clientRef` (`ensureRef`) instead of trusting `add` to have made one.** Reported from the UI: pressing Complete sale did nothing at all. `complete()` began `if (!covered || busy || !clientRef) return;`, and a cart already saved on the device from before checkout existed has lines but no reference, so the press hit a silent return. Checkout now creates and saves the reference on demand, and every refusal says why (a toast, plus `console.error` on a failed mutation). No guard on that path fails silently any more.
- 2026-09-18: **The payment sheet is rendered once, by `PosScreen`.** `InvoicePanel` renders twice (the desktop column and the mobile order sheet), so the sheet was mounted twice, and on narrow screens one copy was a Radix dialog nested inside the Radix sheet — a known way to lose clicks. `InvoicePanel` now takes an `onPlaceOrder` callback, and opening the payment sheet closes the order sheet first.
- 2026-09-18: **The dev deployment's `SITE_URL` is `https://www.payspace.shop`**, not the `http://localhost:3000` the 2026-09-16 entry describes. Better Auth trusts only that origin, so local sign-in and sign-up return 403 "Invalid origin" and the POS can't be clicked through locally. It matters which way this is fixed, because production may still be pointed at this dev deployment (the 2026-09-16 entry left Vercel to be repointed by hand).
- 2026-09-18: **Analytics reads only the rollups, never raw sales.** `summary` takes up to 366 daily rows; `topProducts` is capped at 31 days, because it reads one row per product per day (30 days x 297 products is ~9,000 rows against a "loads in under a second" target). If a longer top-items range is ever wanted, that needs a further per-product-per-month rollup rather than a bigger `take`.
- 2026-09-18: **Week-over-week compares the same span shifted back 7 days,** so "today" is measured against the same weekday, not yesterday. `topProducts` returns `capped` so the UI can say when a busy range made the lists a sample.
- 2026-09-18: **Added Recharts** (the stack list in CLAUDE.md always named it; it had never been installed). Only the hourly columns use it - the payment mix, top items and the heatmap are plain HTML, which is lighter and easier to get right.
- 2026-09-18: **New `--viz-*` chart tokens in `app/globals.css`.** The shadcn `--chart-*` defaults that shipped with the install were never designed for this app and fail the validator (chart-4 sits at L 0.80, outside the light band). The new steps are anchored on the brand blue, and the dark steps are selected for the dark card rather than flipped.
- 2026-09-18: **Alerts live on the Dashboard, not on Analytics.** The dashboard is where someone lands and acts; Analytics is for looking back.
- 2026-09-18: **`tenants.bySlug` now returns `timezone` and `currency`,** because anything working out a business date on the client (analytics ranges, receipts) needs the shop's own calendar rather than the tablet's. `targetMarginBps` comes from the manager-only `analytics.summary` instead of the shop context.
- 2026-09-18: **The clock is read through `useSyncExternalStore`, never during render.** React 19's compiler lint rejects both `Date.now()` in render (`react-hooks/purity`) and settling it with `setState` in an effect (`react-hooks/set-state-in-effect`). `useShopToday` reads it as external state and returns null on the server, so preset ranges are derived rather than stored and the queries skip until the browser has a date.
- 2026-09-19: **Switching VAT off is a 0% rate, not a separate `vatEnabled` flag.** A second flag would mean two sources of truth for what a shop charges, and every call site that forgot it would price a sale wrong in silence (rules 5 and 6). The trade is that turning VAT off forgets the old rate; turning it back on offers 12% in a field the owner confirms before saving.
- 2026-09-19: **A receipt reads its own VAT out of its own totals** (`taxFromTotals` in `convex/lib/money.ts`), and `sales.byToken` no longer sends the shop's current tax settings. The rate is `tax / (total - tax)` and "prices included it" is `total === subtotal`, both exact from what the sale already stores, so no schema change and no backfill. Without this, switching VAT off would have removed the VAT line from every receipt ever issued while the amount stayed inside the total.
- 2026-09-19: **Route changes show a skeleton, not a frozen screen.** `loading.tsx` at `app/[shop]/(manage)/` (plus a checkout-shaped one under `pos/`) gives every rail destination a Suspense boundary, and `useLinkStatus` drives a spinner on the tapped icon and a progress sliver in the top bar. Both hints wait 140 ms before appearing so an already-prefetched route never flashes one.
