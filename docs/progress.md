# Progress

Update this at the end of every session: tick what's done, note decisions and open questions.

## Current status

**Week 2 (products and catalog) is built (2026-09-13).** The security review of Weeks 1 and 2 is done: no critical or high findings, the small fixes are in, and 2 medium items remain (below).
- Checks: `npm test` (65 tests), `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass.
- An end-to-end run on the cloud dev deployment passed:
  - sign-up and sign-in
  - create a café
  - apply the template (20 products, 5 modifier groups, iced latte cost ₱50.40)
  - search
  - an import batch with a duplicate barcode reported per row
  - every new page returns 200
- That run left a test user `smoke+1789243401@example.com` and shop `smokemtytcb0x` in the dev deployment.

**Left for Week 2:**
- Click through in a real browser:
  - add a product with a photo (convex-test can't check an accepted upload's content type)
  - edit modifiers
  - import a real 300-row CSV
  - check the layout on a phone and tablet
- Security review follow-ups (2026-09-13 review). Fixed so far:
  - the `next` redirect bypass with tab or newline characters (`lib/safe-redirect.ts`, now tested)
  - photos limited to JPEG, PNG and WebP
  - currency, time zone and receipt footer validated

**Security items still to decide (from the review):**
- **Medium: sign-in rate limiting.** Better Auth only turns its limiter on when `NODE_ENV === "production"`, which Convex doesn't set, and it defaults to in-memory storage.
  - Set `rateLimit: { enabled: true, storage: "database" }` with a sign-in rule, and set `advanced.ipAddress` for the Vercel to Convex header chain.
  - Verify on the deployed stack: 10 bad sign-ins in a row should return 429.
- **Low: storage IDs aren't tied to a shop.** Add an `uploads` table `{ tenantId, storageId }` and require it in `prepareProduct` before any code deletes photos. Stop sending `imageId` to clients.
- **Low: security headers.** Add `frame-ancestors 'none'` (clickjacking), `nosniff`, `Referrer-Policy`, and a basic CSP in `next.config.ts`.
- **Low: shops per user.** Cap how many shops one account can create (slug squatting), especially while email verification is off.
- **Week 4 note:** checkout must clamp line totals at zero or above, because modifier price changes can be negative, and cap quantities.
- **Lint gap:** the lint rule should also block `queryGeneric` and `mutationGeneric`.

**Still open from Week 1:** real PWA icons (192 and 512 px).

**Next up:** Week 3, inventory and costing.

### Open questions
- Development now runs on the **cloud dev deployment** `dev:judicious-porcupine-20` (team anthony-333, project payspace). The anonymous local deployment is no longer used.
- `components/convex-client-provider.tsx` casts `authClient`: `@convex-dev/better-auth` 0.12.5 is typed against `better-auth` 1.6.15, and 1.6.31's session type no longer matches. Remove the cast when the component updates.
- Email verification is off (`requireEmailVerification: false`) until Resend is wired up. It must be on before pilots.
- Product photos that are replaced or removed stay in file storage. Add a cleanup job (unreferenced `_storage` files older than a day) before launch.
- Until receiving exists, the cost typed on a stocked product sets its stock item's `avgCost` directly. In Week 3, decide whether that field stays editable once an item has receipts.
- Blank lines in an import CSV are skipped, so the row numbers in the preview can drift from spreadsheet line numbers if a file has blank lines in the middle.

## Roadmap

### Week 1: Foundation and tenancy
- [x] Next.js app (TypeScript, Tailwind, shadcn/ui with the Nova preset and Radix), PWA manifest. Real icons still to come.
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
- [ ] Stock items with units, receiving with weighted average cost
- [ ] Adjustments, waste, stock counts, ledger
- [ ] Recipe editor with live cost and margin; background cost recalculation and margin flags

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
- [ ] Clean up orphaned product photos in file storage
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
