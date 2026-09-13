import { z } from "zod";

// The CSP has no 'unsafe-eval' (next.config.ts). Zod falls back without it, but its `new Function`
// probe still reports a CSP violation on every form, so skip the JIT entirely.
z.config({ jitless: true });
