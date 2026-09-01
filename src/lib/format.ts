export type UserSettings = {
  currency: string;
  locale: string;
};

/** Amount formatted with the user's own currency/locale settings (e.g.
 * "₹1,234.50" for currency "INR", locale "en-IN") instead of a hardcoded
 * symbol + en-IN grouping. */
export function formatCurrency(amount: number, settings: UserSettings): string {
  return new Intl.NumberFormat(settings.locale, {
    style: "currency",
    currency: settings.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Just the currency symbol (e.g. "₹"), for a form field label like
 * "Amount (₹)" that isn't formatting an actual number. */
export function currencySymbol(settings: UserSettings): string {
  const part = new Intl.NumberFormat(settings.locale, {
    style: "currency",
    currency: settings.currency,
  }).formatToParts(0);
  return part.find((p) => p.type === "currency")?.value ?? settings.currency;
}

/** A "YYYY-MM-DD" date-only string, formatted for display. Parsed as local
 * midnight (not UTC) so the calendar day shown never shifts with the
 * viewer's own UTC offset. */
export function formatDateOnly(iso: string, settings: UserSettings): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(settings.locale, { day: "numeric", month: "short", year: "numeric" });
}

/** A real timestamp (e.g. createdAt), formatted for display. */
export function formatDateTime(iso: string, settings: UserSettings): string {
  return new Date(iso).toLocaleDateString(settings.locale, { day: "numeric", month: "short", year: "numeric" });
}
