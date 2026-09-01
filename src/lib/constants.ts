import type { AccountType } from "@prisma/client";

// Starting category list given to every new user (signup, and the one-time
// legacy-data seed) — from here on, each user's own categories live in the
// Category table and can be freely added to/renamed/removed per user; see
// the Categories tab on /settings. Not read directly by the app's UI anymore.
export const DEFAULT_EXPENSE_CATEGORIES = [
  "Food & Groceries",
  "Insurance",
  "Savings & Deposits",
  "Rent",
  "Utilities",
  "Transport & Fuel",
  "Medical & Health",
  "Education",
  "Shopping",
  "Entertainment",
  "Investment",
  "EMI / Loan",
  "Others",
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  "Salary",
  "Interest / Dividend",
  "Refund / Cashback",
  "Gift",
  "Bonus",
  "EMI Repayment",
  "Other Income",
] as const;

// Starting medium list given to every new user — from here on, each user's
// own mediums live in the Medium table and can be freely added to/renamed/
// removed per user, along with which account types each one allows as a
// source and an optional default account; see the Mediums tab on /settings.
// Not read directly by the app's UI anymore.
export const DEFAULT_MEDIUMS: { name: string; allowedAccountTypes: AccountType[] }[] = [
  { name: "Cash", allowedAccountTypes: ["CASH"] },
  { name: "Card", allowedAccountTypes: ["CREDIT", "PREPAID"] },
  { name: "Digital Wallet", allowedAccountTypes: [] }, // [] = any account type
];

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  BANK: "Bank",
  CREDIT: "Credit Card",
  PREPAID: "Prepaid",
  CASH: "Cash",
  WALLET: "Wallet",
};

// Starting account-role list given to every new user — from here on, each
// user's own roles live in the AccountRole table and can be freely added
// to/renamed/removed per user (see the Account Roles tab on /settings).
// Account.role itself is just a free-text label (like Transaction.category),
// not an enum — every distinct role value in use automatically gets its own
// Dashboard summary total, not just "Emergency Fund". Not read directly by
// the app's UI anymore.
export const DEFAULT_ACCOUNT_ROLES = [
  "General",
  "Salary Account",
  "Expense Account",
  "Emergency Fund",
  "Investment",
  "Retirement Fund",
];

// Curated options for the per-user Settings page (currency/locale/timezone).
// Not exhaustive — just enough common choices to be useful beyond India;
// extend this list rather than adding a free-text input.
export const CURRENCY_OPTIONS = [
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "SGD", label: "Singapore Dollar (S$)" },
  { code: "AED", label: "UAE Dirham (د.إ)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
] as const;

export const LOCALE_OPTIONS = [
  { code: "en-IN", label: "English (India)" },
  { code: "en-US", label: "English (United States)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "en-AU", label: "English (Australia)" },
  { code: "en-CA", label: "English (Canada)" },
  { code: "en-SG", label: "English (Singapore)" },
] as const;

export const TIMEZONE_OPTIONS = [
  { tz: "Asia/Kolkata", label: "India Standard Time (Kolkata)" },
  { tz: "Asia/Dubai", label: "Gulf Standard Time (Dubai)" },
  { tz: "Asia/Singapore", label: "Singapore Time" },
  { tz: "Asia/Tokyo", label: "Japan Standard Time (Tokyo)" },
  { tz: "Europe/London", label: "UK Time (London)" },
  { tz: "Europe/Berlin", label: "Central European Time (Berlin)" },
  { tz: "America/New_York", label: "Eastern Time (New York)" },
  { tz: "America/Chicago", label: "Central Time (Chicago)" },
  { tz: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { tz: "Australia/Sydney", label: "Australian Eastern Time (Sydney)" },
  { tz: "UTC", label: "UTC" },
] as const;

