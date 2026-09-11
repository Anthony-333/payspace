# Progress

Update this at the end of every session: tick what's done, note decisions and open questions.

## Current status

Not started. Next up: **Week 1, Foundation and tenancy.**

## Roadmap

### Week 1: Foundation and tenancy
- [ ] Next.js app (TypeScript, Tailwind, shadcn/ui), PWA manifest
- [ ] Clerk with Organizations and custom roles (manager, cashier); Convex integration
- [ ] Convex schema from `docs/mvp-plan.md`
- [ ] Clerk webhooks → Convex HTTP action (Svix verified) → `tenants`, `members`
- [ ] `tenantQuery`, `tenantMutation`, `requireRole`, `getOwned`
- [ ] Onboarding: create business, choose type, currency, tax; shop-slug routing
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
- [ ] Production Convex and Clerk, Vercel, Sentry, PostHog, scheduled backups
- [ ] Onboard 3 to 5 pilot shops

## Backlog (before a real launch)
- [ ] Senior Citizen / PWD discount: 20% off the VAT-exclusive price, VAT-exempt, applies only to the qualifying customer's items; needs ID number on the sale and its own receipt lines
- [ ] Check BIR requirements for POS registration/accreditation, invoice format, X and Z readings
- [ ] Fast PIN switching between cashiers on a shared tablet

## Decisions log
- (add decisions here with dates)
