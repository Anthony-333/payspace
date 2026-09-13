import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // CLAUDE.md rule 1: tenant data only goes through the wrappers in convex/lib/tenant.ts.
  {
    files: ["convex/**/*.ts"],
    ignores: ["convex/lib/tenant.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["**/_generated/server"],
            importNames: ["query", "mutation", "action"],
            message:
              "Use tenantQuery/tenantMutation (or userQuery/userMutation) from convex/lib/tenant.ts. Internal functions are fine.",
          },
          {
            // The untyped builders register public functions just the same, so they'd bypass the wrappers too.
            group: ["convex/server"],
            importNames: ["queryGeneric", "mutationGeneric", "actionGeneric"],
            message: "Use tenantQuery/tenantMutation (or userQuery/userMutation) from convex/lib/tenant.ts.",
          },
        ],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "convex/_generated/**",
  ]),
]);

export default eslintConfig;
