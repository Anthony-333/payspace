/// <reference types="vite/client" />
// Must include convex/_generated (only .js and .d.ts files) so convex-test can find the module root.
export const modules = import.meta.glob("./**/*.*s");
