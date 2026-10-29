import posthog from "posthog-js";
import { scrubAnalyticsEvent } from "@/lib/analytics-scrub";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (projectToken && host) {
  posthog.init(projectToken, {
    api_host: host,
    // The host can be our managed reverse proxy (t.payspace.shop); links into PostHog still go to the app.
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    // Keep PostHog's ids in memory only: no cookie, localStorage or sessionStorage, so no consent banner is needed
    // (EU/UK ePrivacy). Each full page load starts a new anonymous id; signed-in users are re-identified by user id.
    persistence: "memory",
    // POS screens show loyalty customers' names and phone numbers. Keep screen recordings off and
    // keep on-screen text out of autocaptured clicks, whatever the PostHog project settings say.
    disable_session_recording: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    before_send: scrubAnalyticsEvent,
    debug: process.env.NODE_ENV === "development",
  });
} else if (process.env.NODE_ENV === "development") {
  console.warn(
    "PostHog is off: set NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN and NEXT_PUBLIC_POSTHOG_HOST to send analytics.",
  );
}
