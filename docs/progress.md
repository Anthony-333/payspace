# Progress

Update this at the end of every session: tick what's done, note decisions and open questions.

## Current status

Not started. Next up: **Week 1, Foundation and tenancy.**

## Roadmap

### Week 1: Foundation and tenancy
- [ ] Next.js app (TypeScript, Tailwind, shadcn/ui), PWA manifest
- [ ] Better Auth (email and password) through `@convex-dev/better-auth`; sign-in and sign-up pages
- [ ] Convex schema from `docs/mvp-plan.md`
- [ ] `tenantQuery`, `tenantMutation`, `userQuery`, `userMutation`, `requireRole`, `getOwned`; lint rule against raw `query`/`mutation`
- [ ] Onboarding: `tenants.create` (business + owner member in one transaction), type, currency, tax; shop-slug routing
- [ ] **Tests:** shop A can't list, read or edit shop B's data through any function

### Week 2: Products and catalog
- [ ] Categories, products, modifier groups, images, barcodes, search, archive
- [ ] Business templates (café, grocery, bakery)
- [ ] CSV import with preview and per-row errors

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
- [ ] Senior Citizen / PWD discount: 20% off the VAT-exclusive price, VAT-exempt, applies only to the qualifying customer's items; needs ID number on the sale and its own receipt lines
- [ ] Check BIR requirements for POS registration/accreditation, invoice format, X and Z readings
- [ ] Fast PIN switching between cashiers on a shared tablet

## Decisions log
- 2026-09-12: **Clerk replaced with Better Auth** via `@convex-dev/better-auth`, used for sign-in only. Businesses, staff and roles live in our own Convex `tenants` and `members` tables, not in Better Auth's organization plugin (which would need a "local install" schema). This means no webhooks, no svix and no paid role add-on. `members.userId` is the Better Auth user ID (`identity.subject`).
- 2026-09-12: Version pins: `better-auth@~1.6.x` (the component requires `<1.7`) and `vitest@^4` (better-auth's peer range).
- 2026-09-12: Indexes that didn't start with `tenantId` in the spec (`products.by_stock_item`, `recipeLines.by_product`, `recipeLines.by_stock_item`) now do. Global lookups stay: `tenants.by_slug`, `members.by_user`, `sales.by_receipt_token`, `exports.by_expires`.
- 2026-09-12: Staff invites (our own `invites` table, Resend email, accept page) are built in Week 7 with staff management.
- 2026-09-12: `@convex-dev/agent`, `ai` and `@ai-sdk/anthropic` approved for the Version 1.1 "Ask your shop" assistant; setup notes in `docs/setup/convex-agent.md`.
