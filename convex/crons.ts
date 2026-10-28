import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 19:00 UTC. Shops are open somewhere at every hour, so these jobs are kept light enough to run
// alongside sales; the time is just fixed so they don't overlap.
crons.cron("delete unused product photos", "0 19 * * *", internal.photos.cleanup, { cursor: null });

crons.cron("delete expired loyalty sessions", "15 19 * * *", internal.loyalty.cleanupSessions, {});

crons.cron("delete sent emails", "30 19 * * *", internal.emails.cleanup, {});

export default crons;
