# @convex-dev/agent setup ("Ask your shop")

Checked 2026-09-12 against `@convex-dev/agent` 0.7.2 and https://docs.convex.dev/agents. In the spec this feature is **Version 1.1**, so install it once Week 1 has put Convex and the tenant wrapper in place.

## Packages

| Package | Version | Why |
|---|---|---|
| `@convex-dev/agent` | 0.7.2 | The component |
| `ai` | ^7 (7.0.97) | Peer dependency (Vercel AI SDK) |
| `@ai-sdk/anthropic` | ^4 | Language model provider (Claude) |
| `@ai-sdk/openai` | ^4 | *Optional*, only if we want embeddings / vector search (Anthropic has no embedding model) |
| `convex-helpers` | already in the stack | Peer dependency |

`@ai-sdk/provider` (^4) and `@ai-sdk/provider-utils` (^5) are peers too. npm installs them automatically; `npm ls` confirms it.

## Checklist

1. Prerequisite: Convex is set up and `convex/convex.config.ts` exists (it already registers `betterAuth`).
2. Install: `npm install @convex-dev/agent ai@^7 @ai-sdk/anthropic`
3. Register the component in `convex/convex.config.ts`:
   ```ts
   import agent from "@convex-dev/agent/convex.config";
   app.use(agent); // next to app.use(betterAuth)
   ```
4. Run `npx convex dev` so `components.agent` is generated.
5. Set the provider key in Convex (not `.env.local`): `npx convex env set ANTHROPIC_API_KEY <key>`
6. Define the agent, e.g. in `convex/ai/shopAgent.ts`:
   ```ts
   import { Agent, stepCountIs } from "@convex-dev/agent";
   import { anthropic } from "@ai-sdk/anthropic";
   import { components } from "../_generated/api";

   export const shopAgent = new Agent(components.agent, {
     name: "Shop assistant",
     languageModel: anthropic("claude-sonnet-5"),
     instructions: "Answer questions about this shop's sales, stock and margins using only the tools.",
     tools: { /* createTool(...) wrappers around internal tenant-scoped queries */ },
     stopWhen: stepCountIs(5),
   });
   ```
7. Tenant-safe wiring (required by our rules, because the component's `userId` is a free-form string with no authorization of its own):
   - Add an `aiThreads` table: `{ tenantId, memberId, threadId }` with indexes that start with `tenantId`.
   - `ai.ask` is a `tenantMutation` that calls `requireRole(owner, manager)`, finds or creates the thread and records it in `aiThreads`, calls `saveMessage(...)`, then `ctx.scheduler.runAfter(0, internal.ai.respond, { tenantId, threadId, promptMessageId })`.
   - `ai.respond` is an `internalAction` that calls `shopAgent.generateText(ctx, { threadId }, { promptMessageId })`. Tools close over the `tenantId` from the job arguments and never take it from model output. They read only the rollup tables.
   - `ai.listMessages` is a `tenantQuery` that checks the thread belongs to `ctx.tenantId` via `aiThreads`, then returns `listUIMessages(ctx, components.agent, args)`.
   - Client: `useUIMessages(api.ai.listMessages, { threadId }, { initialNumItems: 10, stream: true })` from `@convex-dev/agent/react`.
8. Cost control: `usageHandler` records tokens per tenant. Add rate limits with the Rate Limiter component (a new dependency, so ask first).

## Environment variables

| Variable | Where | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Convex env | Yes, if using Claude |
| `OPENAI_API_KEY` | Convex env | Only for OpenAI embeddings/models |

The component itself needs no env vars, and nothing goes in `.env.local`.

## Verification

1. `npm ls @convex-dev/agent ai @ai-sdk/anthropic` shows 0.7.x and ai 7.x with no peer-dependency errors.
2. `npx convex dev` starts cleanly, and `convex/_generated/api.d.ts` lists `agent` under `components`.
3. The Convex dashboard's Components view shows `agent` and its tables.
4. `npx convex env list` includes `ANTHROPIC_API_KEY`.
5. Smoke test: a temporary internal action that creates a thread and asks "Reply with OK". Run it with `npx convex run <module>:<fn>` and expect text back. It costs a few tokens; delete it afterwards.
6. convex-test: a member of shop B can't list or continue shop A's thread, and a cashier can't call `ai.ask`. Use the AI SDK's mock language model (`ai/test`) so the tests make no network calls.
7. `npm test`, `npm run lint` and `npx tsc --noEmit` pass.
