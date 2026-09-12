# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# Multi-tenant POS (MVP)

A web point of sale for small businesses: coffee shops, groceries, bakeries and small retail. Many businesses (tenants) share one app, and each gets its own staff, catalog, stock, sales and reports. The main selling point is **true profit per item**: recipe costing, so owners see what they made, not just what they sold.

## Read these first

- `docs/mvp-plan.md` is the full plan: scope, architecture, Convex schema, feature rules, roles, the 8-week roadmap, risks. Treat it as the spec.
- `docs/progress.md` tracks what's done, plus the decisions log. Update it at the end of every session.
- `docs/prototypes/pos-checkout.html` is a working prototype of the checkout screen (open it in a browser). Use it as the reference for the POS layout, the payment flow, and the pricing, change and split-payment logic.
- `docs/prototypes/mvp-plan.html` is an older formatted copy of the plan for humans. It still describes Clerk, so the markdown file wins.
- `docs/setup/` holds setup notes for components we add later (for example `convex-agent.md`).
- `.claude/agents/` holds the project's specialist agents: `orchestrator`, `stack-expert`, `security-reviewer`, `ui-ux-designer` and `legal-compliance`.

## Project notes

- Next.js 16 and React 19 ship with ESLint 9 using the flat config.
- The path alias `@/*` maps to the repo root (there is no `src/`).
- Tailwind v4 is configured in CSS (`app/globals.css`, `@import "tailwindcss"` and `@theme`); there is no `tailwind.config.*`.
- Next.js 16 ships its own docs in `node_modules/next/dist/docs/`. Read the relevant guide there before writing Next.js code (see `AGENTS.md`). `params` and `searchParams` are async, and the middleware file is `proxy.ts`.

## Stack

- Next.js (App Router, TypeScript, strict mode)
- Convex for the database, server functions, file storage, scheduler and crons
- Better Auth through the `@convex-dev/better-auth` Convex component, used **for sign-in only** (email and password). Shops, staff and roles live in our own Convex tables (`tenants`, `members`), not in an auth provider.
- Tailwind CSS and shadcn/ui; charts built on Recharts
- Zustand for cart state, React Hook Form and Zod (with `@hookform/resolvers`) for forms
- convex-helpers (custom functions), Vitest and convex-test (with `@edge-runtime/vm`) for tests
- fflate for ZIP backups, Resend for email
- `@convex-dev/agent`, `ai` and `@ai-sdk/anthropic` for the Version 1.1 "Ask your shop" assistant (see `docs/setup/convex-agent.md`)

Library APIs change. Before using an API from the plan, check the current docs, and tell me if the plan is out of date. Known pins:
- `better-auth` stays on `~1.6.x`, because `@convex-dev/better-auth` 0.12 requires `<1.7`.
- Vitest stays on 4.x, because `better-auth`'s peer range stops at 4.

## Architecture

- **Shared database.** All tenants share the same Convex tables. Every tenant-owned document has a `tenantId`, and `tenantId` leads every index. Isolation lives in code, in one wrapper.
- **How a request finds its tenant.**
  - Better Auth issues a Convex JWT whose `identity.subject` is the Better Auth user id. The token lasts 15 minutes and is not re-validated on each call.
  - Onboarding calls `tenants.create`, which inserts the tenant and its owner `members` row in one transaction.
  - The shop slug is in the URL (`app/[shop]/...`). The layout resolves it to a `tenantId`, and the client passes that `tenantId` to every Convex call.
  - `tenantQuery`/`tenantMutation` look up an active `members` row for `(tenantId, identity.subject)` and add `ctx.tenantId`, `ctx.tenant` and `ctx.member`. Because membership is checked in our table on every call, disabling a staff member revokes access immediately, even while their token is still valid.
  - Calls that need a signed-in user but no shop (list my shops, create a shop) use `userQuery`/`userMutation`.
- **Products vs stock items.** A product is what the POS sells; a stock item is what sits on the shelf. A product's `kind` is one of:
  - `stocked`: one-to-one with a stock item, the grocery case.
  - `recipe`: `recipeLines` consume several stock items in base units (g, ml, pc).
  - `service`: no stock.

  Modifier options carry both a `priceDelta` and a `recipeDelta`.
- **Checkout is one transaction** (`sales.checkout`). It returns early on a repeated `clientRef`, then prices on the server and writes the sale with its snapshots. It also deducts stock through `stockMovements`, updates the `dailyStats`/`productDailyStats` rollups, and takes the next sale number from `counters`. Dashboards read the rollups, not raw sales, and update live through Convex subscriptions.
- **Costing** uses weighted average cost on `stockItems.avgCost`. When a receipt changes a stock item's cost, a scheduled job recomputes the cached `products.unitCost` and flags any product below the target margin.
- **Exports** follow one pipeline. `exports.request` checks the role and inserts a job, and `exportsRun.run` (a `"use node"` internal action) reads the data 500 rows at a time. It then writes the CSV or ZIP to file storage and marks the job ready. A daily cron removes expired files and fails jobs that got stuck.
- The planned `app/` and `convex/` layout is in the "App structure and tooling" section of `docs/mvp-plan.md`. Reserved slugs are defined in `convex/lib/slugs.ts`. The public receipt lives at `/r/[token]`.

## Non-negotiable rules

1. **Tenant isolation.** Every tenant-scoped Convex function uses `tenantQuery` or `tenantMutation` from `convex/lib/tenant.ts`. These check for an active `members` row for the caller and the `tenantId`. Never import the raw `query` or `mutation` for tenant data (ESLint enforces this). The exceptions are the auth wiring (`convex/auth.ts`, `convex/http.ts`), internal functions, the public receipt page, and the user-scoped wrappers in `convex/lib/`.
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
- `npx convex dev` runs the Convex dev deployment, syncs functions and generates types (`convex/_generated/`). In a non-interactive shell, with no deployment configured, it provisions an anonymous local deployment. Use `npx convex dev --once` for a single sync and codegen pass.
- `npx convex env set NAME value` sets Convex environment variables
- `npm test` runs Vitest (including convex-test suites)
- Single test: `npx vitest run convex/tenancy.test.ts -t "test name"`
- `npm run build` builds for production
- `npm run lint` and `npx tsc --noEmit` must pass before finishing a task

## Environment

- **`.env.local` (Next.js):**
  - `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` (both written by `npx convex dev`)
  - `NEXT_PUBLIC_CONVEX_SITE_URL`: the same deployment, ending in `.convex.site` (the Better Auth HTTP routes live there)
  - `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000` in development
- **Convex environment variables:**
  - `BETTER_AUTH_SECRET` (`openssl rand -base64 32`)
  - `SITE_URL` (the Next.js origin)
  - Later: `RESEND_API_KEY` and `ANTHROPIC_API_KEY`
- There is no third-party auth dashboard to configure.

## Market defaults

- The launch market is the Philippines: currency PHP, timezone Asia/Manila, 12% VAT included in prices (configurable per shop).
- E-wallets (GCash, Maya) are recorded with a reference number; card payments are recorded, not processed, in the MVP.
- Before launch, see the backlog in `docs/progress.md`: BIR receipt requirements and the Senior Citizen / PWD discount rule.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
