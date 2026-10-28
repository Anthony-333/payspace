"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/convex/lib/money";

// The shop's currency and time zone, shared by onboarding and Settings. The server checks
// both again (tenants.ts checkLocale), so these lists only shape what's easy to pick.

/** The device's time zone, which is almost always the shop's own when someone sets it up. */
export function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function timezones(current: string) {
  let zones: string[] = [];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    // Older browsers: the current zone and UTC are still offered below.
  }
  return [...new Set([current, "UTC", ...zones])].sort((a, b) => a.localeCompare(b));
}

export function CurrencySelect({ id, value, onChange }: { id?: string; value: string; onChange: (code: string) => void }) {
  const known = CURRENCIES.some((c) => c.code === value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} size="lg" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {!known && <SelectItem value={value}>{value}</SelectItem>}
        {CURRENCIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.name} ({c.symbol.trim()}, {c.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TimezoneSelect({ id, value, onChange }: { id?: string; value: string; onChange: (zone: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} size="lg" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {timezones(value).map((zone) => (
          <SelectItem key={zone} value={zone}>{zone.replace(/_/g, " ")}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
