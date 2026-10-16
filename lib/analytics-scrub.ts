import type { BeforeSendFn, Properties } from "posthog-js";

// URLs that carry secrets or a customer's identity. A public receipt token is a capability (anyone
// with the link sees the sale), reset/verify links carry one-time tokens in ?token=, and a loyalty
// card URL names the customer.
const RULES: [RegExp, string][] = [
  [/\/r\/[^/?#\s"']+/g, "/r/:token"],
  [/(\/loyalty\/[^/?#\s"']+)\/[^/?#\s"']+/g, "$1/:username"],
  [/([?&]token=)[^&#\s"']*/g, "$1redacted"],
];

export function scrubUrlText(text: string): string {
  return RULES.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}

function scrubProperties(props: Properties | undefined): Properties | undefined {
  if (!props) return props;
  const out: Properties = {};
  for (const [key, value] of Object.entries(props)) {
    out[key] = typeof value === "string" ? scrubUrlText(value) : value;
  }
  return out;
}

/** PostHog `before_send` hook: rewrites every top-level string property, `$set` and `$set_once`. */
export const scrubAnalyticsEvent: BeforeSendFn = (event) => ({
  ...event,
  properties: scrubProperties(event.properties) ?? {},
  $set: scrubProperties(event.$set),
  $set_once: scrubProperties(event.$set_once),
});
