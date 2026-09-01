import type { AccountType } from "@prisma/client";

/** Medium.allowedAccountTypes is stored as a comma-separated string (SQLite
 * has no native scalar-list type, unlike Postgres) — these two functions are
 * the only place that format is dealt with directly. */
export function parseAllowedAccountTypes(stored: string): AccountType[] {
  return stored ? (stored.split(",") as AccountType[]) : [];
}

export function serializeAllowedAccountTypes(types: AccountType[]): string {
  return types.join(",");
}
