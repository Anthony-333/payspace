import { defineComponent } from "convex/server";

// Installed locally (not from the package) so we can add indexes to Better Auth's tables.
const component = defineComponent("betterAuth");

export default component;
