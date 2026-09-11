# POS MVP starter kit

Everything needed to start building with Claude Code.

## Contents

- `CLAUDE.md`: project context and rules. Claude Code reads it automatically.
- `docs/mvp-plan.md`: the full spec.
- `docs/progress.md`: roadmap checklist and backlog.
- `docs/prototypes/pos-checkout.html`: working checkout screen prototype (open in a browser).
- `docs/prototypes/mvp-plan.html`: the plan as a formatted page.
- `docs/naming-ideas.md`: name and domain shortlist.

## How to start

1. Create an empty project folder and unzip this kit into it, so `CLAUDE.md` sits at the root.
2. Have accounts ready at clerk.com and convex.dev (both have free tiers), plus Node.js 20 or newer.
3. Open the folder in Claude Code and paste the first prompt below.

## Prompt 1: kickoff (Week 1)

> Read CLAUDE.md, docs/mvp-plan.md and docs/progress.md. We're starting Week 1: Foundation and tenancy. First, check the current docs for Next.js, Clerk and Convex, and tell me anything in the plan that's out of date. Then give me a short plan for Week 1 and a step-by-step checklist of what I need to set up by hand in the Clerk and Convex dashboards. Wait for my OK before writing code. When you build, include the convex-test tenant isolation suite, and update docs/progress.md at the end.

## Prompt for each following week

> Read docs/progress.md and continue with the next unfinished week from docs/mvp-plan.md. Propose the plan and any manual setup first, and wait for my OK. Finish with passing tests, lint and type checks, then update docs/progress.md.

## Prompt for the checkout screen (Week 4)

> Build app/[shop]/pos using docs/prototypes/pos-checkout.html as the reference for layout, flow and pricing logic. Use React components with shadcn/ui, and Zustand for the cart (persisted so it survives a refresh). Wire "Complete sale" to the sales.checkout mutation with a clientRef, and keep all money in integer centavos. Match the prototype's behaviour for modifiers, parked orders, the manager PIN on large discounts, split payments, quick cash buttons and change due.
