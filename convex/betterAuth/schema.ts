import { defineSchema } from "convex/server";
import { tables } from "./generatedSchema";

// Better Auth 1.6 prunes expired rateLimit rows by lastRequest, which the generated schema doesn't index.
const schema = defineSchema({
  ...tables,
  rateLimit: tables.rateLimit.index("lastRequest", ["lastRequest"]),
});

export default schema;
