/**
 * "Now", resolved in an IANA timezone's wall-clock rules rather than a
 * hardcoded UTC offset — used everywhere the app decides "what day/period is
 * it" server-side, since Vercel's serverless functions run in UTC regardless
 * of where the user actually is. Using the zone's own rules (not a fixed
 * offset) means this stays correct even for a zone that observes daylight
 * saving, without any special-casing here.
 *
 * Returns a Date whose UTC-read components (getUTCFullYear/getUTCMonth/
 * getUTCDate/etc.) equal what a clock on the wall in that timezone shows
 * right now — read it with those UTC getters, matching the rest of this
 * codebase's convention for date math.
 */
export function nowInTimezone(timezone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  // Some ICU versions report midnight as hour "24" instead of "00".
  const hour = get("hour") % 24;

  return new Date(Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second")));
}

/** Default-timezone fallback for the rare call site without a user's own
 * settings in scope (e.g. a default parameter value). Prefer nowInTimezone
 * with the current user's own timezone wherever one is available. */
export function nowInIst(): Date {
  return nowInTimezone("Asia/Kolkata");
}
