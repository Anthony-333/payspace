import { defineApp } from "convex/server";
import polar from "@convex-dev/polar/convex.config.js";
import resend from "@convex-dev/resend/convex.config.js";
import betterAuth from "./betterAuth/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(polar);
app.use(resend);

export default app;
