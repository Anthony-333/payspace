# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# Multi-tenant POS (MVP)

A web point of sale for small businesses: coffee shops, groceries, bakeries and small retail. Many businesses (tenants) share one app, and each gets its own staff, catalog, stock, sales and reports. The main selling point is **true profit per item**: recipe costing, so owners see what they made, not just what they sold.

## Read these first

- `docs/mvp-plan.md` is the full plan: scope, architecture, Convex schema, feature rules, roles, the 8-week roadmap, risks. Treat it as the spec.
- `docs/progress.md` tracks what's done. Update it at the end of every session.
- `docs/prototypes/pos-checkout.html` is a working prototype of the checkout screen (open it in a browser). Use it as the reference for the POS layout, the payment flow, and the pricing, change and split-payment logic.
- `docs/prototypes/mvp-plan.html` is the same plan as a formatted page, for humans.

## Current state

The repo is still the create-next-app scaffold (Next.js 16, React 19, Tailwind v4, ESLint 9 flat config); only `next`, `react` and Tailwind are installed. Convex, Clerk, shadcn/ui, Vitest and the rest of the stack below get added in Week 1, so `convex/`, `proxy.ts` and the `test` script don't exist yet. Check `docs/progress.md` for how far things have got.

- The path alias `@/*` maps to the repo root (there is no `src/`).
- Tailwind v4 is configured in CSS (`app/globals.css`, `@import "tailwindcss"` and `@theme`); there is no `tailwind.config.*`.
- Next.js 16 ships its own docs in `node_modules/next/dist/docs/`. Read the relevant guide there before writing Next.js code (see `AGENTS.md`).

## Stack

- Next.js (App Router, TypeScript, strict mode)
- Clerk with **Organizations** (one organization = one business), plus custom roles `org:manager` and `org:cashier`; `org:admin` maps to owner
- Convex for the database, server functions, file storage, scheduler and crons
- Tailwind CSS and shadcn/ui; charts built on Recharts
- Zustand for cart state, React Hook Form and Zod for forms
- convex-helpers (custom functions), Vitest and convex-test for tests
- fflate for ZIP backups, Resend for email

Library APIs change. Before using an API from the plan, check the current docs, and tell me if the plan is out of date. Examples: Next.js 16 renamed `middleware.ts` to `proxy.ts`, and the Convex + Clerk setup is done through Clerk's Convex integration.

## Architecture

- **Shared database.** All tenants share the same Convex tables. Every tenant-owned document has a `tenantId`, and `tenantId` leads every index. Isolation lives in code, in one wrapper.
- **How a request finds its tenant.** Clerk org and membership webhooks go to `convex/http.ts` (Svix-verified), which upserts `tenants` and `members`. The shop slug is in the URL (`app/[shop]/...`), and Clerk's `organizationSyncOptions` in `proxy.ts` keeps the active org matched to it. The client passes `tenantId` to every Convex call. `tenantQuery`/`tenantMutation` look up an active `members` row for `(tenantId, identity.subject)` and add `ctx.tenantId`, `ctx.tenant` and `ctx.member`. Membership is checked in our table, not taken from the token, so disabling a staff member revokes access immediately.
- **Products vs stock items.** A product is what the POS sells; a stock item is what sits on the shelf. A product's `kind` is one of:
  - `stocked`: one-to-one with a stock item, the grocery case.
  - `recipe`: `recipeLines` consume several stock items in base units (g, ml, pc).
  - `service`: no stock.

  Modifier options carry both a `priceDelta` and a `recipeDelta`.
- **Checkout is one transaction** (`sales.checkout`). It returns early on a repeated `clientRef`, then prices on the server and writes the sale with its snapshots. It also deducts stock through `stockMovements`, updates the `dailyStats`/`productDailyStats` rollups, and takes the next sale number from `counters`. Dashboards read the rollups, not raw sales, and update live through Convex subscriptions.
- **Costing** uses weighted average cost on `stockItems.avgCost`. When a receipt changes a stock item's cost, a scheduled job recomputes the cached `products.unitCost` via the `by_stock_item` indexes and flags any product below the target margin.
- **Exports** follow one pipeline. `exports.request` checks the role and inserts a job, and `exportsRun.run` (a `"use node"` internal action) reads the data 500 rows at a time. It then writes the CSV or ZIP to file storage and marks the job ready. A daily cron removes expired files and fails jobs that got stuck.
- The planned `app/` and `convex/` layout, including `convex/lib/{tenant,money,costing,stock,dates,csv}.ts`, is in the "App structure and tooling" section of `docs/mvp-plan.md`. Reserved slugs: `app`, `api`, `r`. The public receipt lives at `/r/[token]`.

## Non-negotiable rules

1. **Tenant isolation.** Every tenant-scoped Convex function uses `tenantQuery` or `tenantMutation` from `convex/lib/tenant.ts`. These check for an active `members` row for the caller and the `tenantId`. Never import the raw `query` or `mutation` for tenant data. The exceptions are Clerk webhooks, internal functions, and the public receipt page.
2. **Re-check every ID from the client** with `getOwned()`, so a document from another tenant is never read or changed.
3. **Every tenant query uses an index that starts with `tenantId`.** No `.filter()` scans across tenants.
4. **Roles are enforced on the server** with `requireRole()`. Hiding buttons in the UI is not protection.
5. **Money is always integer minor units** (centavos). Do all money math in `convex/lib/money.ts`. Never use floats for money.
6. **The server prices everything.** Checkout receives product IDs, quantities and option keys, never prices. It is idempotent through `clientRef`.
7. **Sales store snapshots**: name, unit price and unit cost at the time of sale.
8. **The stock ledger is the source of truth.** `onHand` is a cache. Every stock change writes a `stockMovements` row. Allow negative stock, but flag it.
9. **Archive, don't delete,** anything that past sales reference.
10. **Reports use `businessDate`,** computed in the shop's timezone.
11. **Exports**: authorization happens in the request mutation, and the work runs in an internal action. CSV text cells get the formula-injection guard.

## How we work

- Follow the roadmap in `docs/mvp-plan.md` one week at a time. Before coding, propose a short plan and list anything I need to do by hand in a dashboard, then wait for my OK.
- Write tests as you go. The tenant-isolation suite (convex-test) must pass before any feature work is called done.
- Keep commits small, with clear messages.
- At the end of each session, update `docs/progress.md` with what was done, what's next, and any decisions or open questions.
- Ask me before adding a dependency that isn't listed above.

## Commands

- `npm run dev` runs Next.js
- `npx convex dev` runs the Convex dev deployment, syncs functions and generates types (`convex/_generated/`)
- `npm test` runs Vitest (including convex-test suites). Add the `test` script in Week 1 when Vitest is installed.
- Single test: `npx vitest run path/to/file.test.ts -t "test name"`
- `npm run build` builds for production
- `npm run lint` and `npx tsc --noEmit` must pass before finishing a task

## Environment

- `.env.local` (Next.js): `NEXT_PUBLIC_CONVEX_URL` (written by `npx convex dev`), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- Convex dashboard environment variables: the Clerk Frontend API URL used by `convex/auth.config.ts` (use the variable name from the current Convex + Clerk guide), and `CLERK_WEBHOOK_SECRET` for webhook verification
- In the Clerk dashboard: enable Organizations, create the `manager` and `cashier` roles, activate the Convex integration, and add a webhook endpoint pointing to the Convex HTTP action (`/clerk-webhook`) for `organization.*`, `organizationMembership.*` and `user.*` events

## Market defaults

- The launch market is the Philippines: currency PHP, timezone Asia/Manila, 12% VAT included in prices (configurable per shop).
- E-wallets (GCash, Maya) are recorded with a reference number; card payments are recorded, not processed, in the MVP.
- Before launch, see the backlog in `docs/progress.md`: BIR receipt requirements and the Senior Citizen / PWD discount rule.
