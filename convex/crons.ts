import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 19:00 UTC is 3 am in Manila, when shops are closed.
crons.cron("delete unused product photos", "0 19 * * *", internal.photos.cleanup, { cursor: null });

export default crons;
