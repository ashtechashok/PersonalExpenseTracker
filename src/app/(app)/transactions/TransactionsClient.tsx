"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { createTransaction, updateTransaction, deleteTransaction } from "./actions";
import { Card, cardClassName } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Select, inputClass } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DownloadIcon,
  FilterIcon,
  InboxIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  ArrowLeftRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import { formatCurrency as formatCurrencyShared, formatDateOnly, currencySymbol } from "@/lib/format";
import { useSettings } from "@/lib/settings-context";

type RangeKey = "today" | "week" | "month" | "6months" | "year" | "all" | "custom";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "6months", label: "Last 6 Months" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
  { key: "custom", label: "Custom" },
];

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** [start, end] (inclusive, "YYYY-MM-DD") for the preset, or null for "All Time" (no restriction). */
function rangeBounds(key: RangeKey, customFrom: string, customTo: string): { start: string; end: string } | null {
  if (key === "all") return null;

  const now = new Date();
  const today = isoDate(now);

  if (key === "today") return { start: today, end: today };

  if (key === "week") {
    const day = now.getUTCDay(); // 0 = Sun .. 6 = Sat
    const sinceMonday = (day + 6) % 7;
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - sinceMonday));
    return { start: isoDate(monday), end: today };
  }

  if (key === "month") {
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { start: isoDate(first), end: today };
  }

  if (key === "6months") {
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    return { start: isoDate(first), end: today };
  }

  if (key === "year") {
    const first = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return { start: isoDate(first), end: today };
  }

  // custom — both fields default to today, so this is always a real range
  return { start: customFrom, end: customTo };
}

export type ClientAccount = { id: string; name: string; type: "BANK" | "CREDIT" | "PREPAID" | "CASH" | "WALLET" };

export type ClientMedium = { id: string; name: string; allowedAccountTypes: string[]; defaultAccountId: string | null };

export type TransactionType = "EXPENSE" | "INCOME" | "SELF_TRANSFER";

export type ClientTransaction = {
  id: string;
  type: TransactionType;
  date: string;
  amount: number;
  purpose: string;
  category: string;
  medium: string | null;
  sourceAccountId: string | null;
  creditAccountId: string | null;
  destination: string | null;
};

const PAGE_SIZE = 50;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type FormState = {
  id: string | null;
  type: TransactionType;
  date: string;
  amount: string;
  purpose: string;
  category: string;
  medium: string;
  sourceAccountId: string;
  creditAccountId: string;
  destination: string;
};

// New expenses default to the first configured medium (and that medium's
// own default account, if it has one) — override anytime from the dropdowns.
// See the Mediums tab on /settings for where that default account is configured.
function emptyForm(mediums: ClientMedium[]): FormState {
  const first = mediums[0];
  return {
    id: null,
    type: "EXPENSE",
    date: todayIso(),
    amount: "",
    purpose: "",
    category: "",
    medium: first?.name ?? "",
    sourceAccountId: first?.defaultAccountId ?? "",
    creditAccountId: "",
    destination: "",
  };
}

type ColumnKey = "date" | "type" | "amount" | "purpose" | "category" | "medium" | "source" | "credit" | "notes";

const COLUMNS: { key: ColumnKey; label: string; defaultDir: "asc" | "desc" }[] = [
  { key: "date", label: "Date", defaultDir: "desc" },
  { key: "type", label: "Type", defaultDir: "asc" },
  { key: "amount", label: "Amount", defaultDir: "desc" },
  { key: "purpose", label: "Purpose", defaultDir: "asc" },
  { key: "category", label: "Category", defaultDir: "asc" },
  { key: "medium", label: "Medium", defaultDir: "asc" },
  { key: "source", label: "Source", defaultDir: "asc" },
  { key: "credit", label: "Credited To", defaultDir: "asc" },
  { key: "notes", label: "Notes", defaultDir: "asc" },
];

export default function TransactionsClient({
  accounts,
  transactions,
  categories,
  mediums,
}: {
  accounts: ClientAccount[];
  transactions: ClientTransaction[];
  categories: { expense: string[]; income: string[] };
  mediums: ClientMedium[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const settings = useSettings();
  const formatCurrency = (n: number) => formatCurrencyShared(n, settings);
  const formatDateDisplay = (iso: string) => formatDateOnly(iso, settings);
  const currency = currencySymbol(settings);

  const [form, setForm] = useState<FormState>(() => emptyForm(mediums));
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMedium, setFilterMedium] = useState("");
  const [filterRange, setFilterRange] = useState<RangeKey>("month");
  const [customFrom, setCustomFrom] = useState(todayIso());
  const [customTo, setCustomTo] = useState(todayIso());

  const [sortColumn, setSortColumn] = useState<ColumnKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const isIncome = form.type === "INCOME";
  const isSelfTransfer = form.type === "SELF_TRANSFER";
  const isExpense = form.type === "EXPENSE";
  const isEditing = form.id !== null;
  const categoryOptions = isIncome ? categories.income : categories.expense;
  const allCategories = [...categories.expense, ...categories.income];

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const mediumByName = useMemo(() => new Map(mediums.map((m) => [m.name, m])), [mediums]);

  const sourceOptions = useMemo(() => {
    const medium = mediumByName.get(form.medium);
    if (!medium) return [];
    if (medium.allowedAccountTypes.length === 0) return accounts;
    return accounts.filter((a) => medium.allowedAccountTypes.includes(a.type));
  }, [accounts, form.medium, mediumByName]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onTypeChange(type: TransactionType) {
    setForm((f) => ({
      ...f,
      type,
      category: "",
      medium: "",
      sourceAccountId: "",
      creditAccountId: "",
    }));
  }

  function onMediumChange(medium: string) {
    const defaultAccountId = mediumByName.get(medium)?.defaultAccountId ?? "";
    setForm((f) => ({ ...f, medium, sourceAccountId: defaultAccountId }));
  }

  function resetForm() {
    setForm(emptyForm(mediums));
    setFormError(null);
  }

  function startEdit(tx: ClientTransaction) {
    setForm({
      id: tx.id,
      type: tx.type,
      date: tx.date,
      amount: String(tx.amount),
      purpose: tx.purpose,
      category: tx.category,
      medium: tx.medium ?? "",
      sourceAccountId: tx.sourceAccountId ?? "",
      creditAccountId: tx.creditAccountId ?? "",
      destination: tx.destination ?? "",
    });
    setFormError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const amount = parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter a valid amount greater than 0.");
      return;
    }

    const input = {
      type: form.type,
      date: form.date,
      amount,
      purpose: form.purpose.trim(),
      category: form.category,
      medium: isExpense ? form.medium : null,
      sourceAccountId: isSelfTransfer || isExpense ? form.sourceAccountId || null : null,
      creditAccountId: form.creditAccountId || null,
      destination: form.destination.trim() || null,
    };

    setPending(true);
    const result = isEditing ? await updateTransaction(form.id as string, input) : await createTransaction(input);
    setPending(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }
    toast.success(
      isEditing ? "Transaction updated" : `${isIncome ? "Income" : isSelfTransfer ? "Transfer" : "Expense"} added`
    );
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Delete this transaction?",
      description: "This will restore the balance(s) it affected.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const result = await deleteTransaction(id);
    if (result.error) toast.error(result.error);
    else toast.success("Transaction deleted");
    router.refresh();
  }

  function sourceDisplay(tx: ClientTransaction) {
    if (tx.type === "INCOME") return "—";
    if (!tx.sourceAccountId) return "Cash";
    return accountById.get(tx.sourceAccountId)?.name ?? "(deleted account)";
  }

  function creditDisplay(tx: ClientTransaction) {
    if (!tx.creditAccountId) return "—";
    return accountById.get(tx.creditAccountId)?.name ?? "(deleted account)";
  }

  function sortValue(t: ClientTransaction, key: ColumnKey): string | number {
    switch (key) {
      case "date":
        return t.date;
      case "type":
        return t.type;
      case "amount":
        return t.amount;
      case "purpose":
        return t.purpose.toLowerCase();
      case "category":
        return t.category.toLowerCase();
      case "medium":
        return (t.medium ?? "").toLowerCase();
      case "source":
        return sourceDisplay(t).toLowerCase();
      case "credit":
        return creditDisplay(t).toLowerCase();
      case "notes":
        return (t.destination ?? "").toLowerCase();
    }
  }

  function onSortClick(key: ColumnKey) {
    if (key === sortColumn) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(key);
      setSortDirection(COLUMNS.find((c) => c.key === key)?.defaultDir ?? "asc");
    }
  }

  const bounds = rangeBounds(filterRange, customFrom, customTo);

  const filtered = transactions
    .filter((t) => !filterType || t.type === filterType)
    .filter((t) => !filterCategory || t.category === filterCategory)
    .filter((t) => !filterMedium || t.medium === filterMedium)
    .filter((t) => !bounds || (t.date >= bounds.start && t.date <= bounds.end));

  const sorted = [...filtered].sort((a, b) => {
    const av = sortValue(a, sortColumn);
    const bv = sortValue(b, sortColumn);
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDirection === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  // Jump back to page 1 whenever the filters or sort change the result set,
  // rather than leaving the user stranded on a now-out-of-range page. Storing
  // the previous key in state and comparing during render (not in an effect)
  // avoids an extra render pass — see "Adjusting state when a prop changes"
  // in the React docs.
  const filterKey = `${filterType}|${filterCategory}|${filterMedium}|${filterRange}|${customFrom}|${customTo}|${sortColumn}|${sortDirection}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function exportCsv() {
    const rows = [
      ["Date", "Type", "Amount", "Purpose", "Category", "Medium", "Source", "Credited To", "Notes"],
      ...sorted.map((t) => [
        t.date,
        t.type,
        String(t.amount),
        t.purpose,
        t.category,
        t.medium ?? "",
        sourceDisplay(t),
        creditDisplay(t),
        t.destination ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${todayIso()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <form ref={formRef} onSubmit={handleSubmit} className={`${cardClassName} space-y-5 p-4 sm:p-6`}>
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              isIncome
                ? "bg-emerald-500/10 text-emerald-300"
                : isSelfTransfer
                  ? "bg-indigo-500/10 text-indigo-300"
                  : "bg-rose-500/10 text-rose-300"
            }`}
          >
            {isIncome ? (
              <ArrowUpRightIcon className="h-[18px] w-[18px]" />
            ) : isSelfTransfer ? (
              <ArrowLeftRightIcon className="h-[18px] w-[18px]" />
            ) : (
              <ArrowDownRightIcon className="h-[18px] w-[18px]" />
            )}
          </div>
          <h2 className="text-base font-semibold text-primary">
            {isEditing ? "Edit" : "Add"} {isIncome ? "Income" : isSelfTransfer ? "Self Transfer" : "Expense"}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Transaction Type">
            <Select value={form.type} onChange={(e) => onTypeChange(e.target.value as TransactionType)} required>
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
              <option value="SELF_TRANSFER">Self Transfer</option>
            </Select>
          </Field>

          <Field label="Date">
            <input
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              className={inputClass}
              required
            />
          </Field>

          <Field label={`Amount (${currency})`}>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="120"
              value={form.amount}
              onChange={(e) => update("amount", e.target.value)}
              className={inputClass}
              required
            />
          </Field>

          <Field label={isIncome ? "Source of Income" : "Purpose"}>
            <input
              type="text"
              placeholder={
                isIncome
                  ? "Salary / Interest / Cashback / Gift"
                  : isSelfTransfer
                    ? "Monthly savings transfer / Credit card payment"
                    : "Groceries / Insurance premium / Savings deposit"
              }
              value={form.purpose}
              onChange={(e) => update("purpose", e.target.value)}
              className={inputClass}
              required
            />
          </Field>

          {!isSelfTransfer && (
            <Field label="Category">
              <Select value={form.category} onChange={(e) => update("category", e.target.value)} required>
                <option value="" disabled>
                  Select category
                </option>
                {categoryOptions.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
          )}

          {isExpense && (
            <Field label="Medium">
              <Select value={form.medium} onChange={(e) => onMediumChange(e.target.value)} required>
                <option value="" disabled>
                  Select medium
                </option>
                {mediums.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {isExpense && (
            <Field label={form.medium ? `Source (${form.medium})` : "Source"}>
              <Select
                value={form.sourceAccountId}
                onChange={(e) => update("sourceAccountId", e.target.value)}
                disabled={!form.medium}
                required
              >
                <option value="" disabled>
                  {form.medium
                    ? sourceOptions.length
                      ? "Select account"
                      : "No matching accounts — add one in Accounts, or check this medium's allowed types"
                    : "Select a medium first"}
                </option>
                {sourceOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({ACCOUNT_TYPE_LABELS[a.type]})
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {isSelfTransfer && (
            <Field label="Source Account">
              <Select value={form.sourceAccountId} onChange={(e) => update("sourceAccountId", e.target.value)} required>
                <option value="" disabled>
                  Select account
                </option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({ACCOUNT_TYPE_LABELS[a.type]})
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {isSelfTransfer && (
            <Field label="Destination Account">
              <Select value={form.creditAccountId} onChange={(e) => update("creditAccountId", e.target.value)} required>
                <option value="" disabled>
                  Select account
                </option>
                {accounts
                  .filter((a) => a.id !== form.sourceAccountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({ACCOUNT_TYPE_LABELS[a.type]})
                    </option>
                  ))}
              </Select>
            </Field>
          )}

          {!isSelfTransfer && (
            <Field
              label={
                isIncome
                  ? "Credit To Account"
                  : "Also Credit To Account (optional — for savings/transfers, e.g. Emergency Fund)"
              }
            >
              <Select value={form.creditAccountId} onChange={(e) => update("creditAccountId", e.target.value)} required={isIncome}>
                <option value="" disabled={isIncome}>
                  {isIncome ? "Select account" : "None (external expense)"}
                </option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({ACCOUNT_TYPE_LABELS[a.type]})
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {isIncome && (
            <Field label="Received From (optional — e.g. Employer, Bank)" full>
              <input
                type="text"
                placeholder="e.g. Employer Payroll"
                value={form.destination}
                onChange={(e) => update("destination", e.target.value)}
                className={inputClass}
              />
            </Field>
          )}
        </div>

        {formError && (
          <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{formError}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" variant="primary" loading={pending}>
            {!pending && <PlusIcon className="h-4 w-4" />}
            {pending
              ? "Saving…"
              : isEditing
                ? "Save Changes"
                : isIncome
                  ? "Add Income"
                  : isSelfTransfer
                    ? "Add Transfer"
                    : "Add Expense"}
          </Button>
          {isEditing && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Transactions table */}
      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-primary">Transactions</h2>
          <div className="flex flex-wrap items-center gap-2">
            <FilterIcon className="h-4 w-4 text-tertiary" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={filterSelectClass}>
              <option value="">All Types</option>
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
              <option value="SELF_TRANSFER">Self Transfer</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={filterSelectClass}
            >
              <option value="">All Categories</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filterMedium}
              onChange={(e) => setFilterMedium(e.target.value)}
              className={filterSelectClass}
            >
              <option value="">All Mediums</option>
              {mediums.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={filterRange}
              onChange={(e) => setFilterRange(e.target.value as RangeKey)}
              className={filterSelectClass}
            >
              {RANGE_OPTIONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
            {filterRange === "custom" && (
              <>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  max={customTo}
                  className={filterSelectClass}
                />
                <span className="text-xs text-tertiary">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  min={customFrom}
                  className={filterSelectClass}
                />
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterType("");
                setFilterCategory("");
                setFilterMedium("");
                setFilterRange("month");
                setCustomFrom(todayIso());
                setCustomTo(todayIso());
              }}
            >
              Clear
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={exportCsv}>
              <DownloadIcon className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-subtle text-left text-xs font-semibold tracking-wide text-tertiary uppercase">
                {COLUMNS.map((col) => (
                  <th key={col.key} className="py-2.5 pr-4">
                    <button
                      type="button"
                      onClick={() => onSortClick(col.key)}
                      className="flex items-center gap-1 transition-colors hover:text-secondary"
                    >
                      {col.label}
                      {sortColumn === col.key ? (
                        sortDirection === "asc" ? (
                          <ChevronUpIcon className="h-3 w-3 text-accent" />
                        ) : (
                          <ChevronDownIcon className="h-3 w-3 text-accent" />
                        )
                      ) : (
                        <ArrowUpDownIcon className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  </th>
                ))}
                <th className="py-2.5 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((t) => {
                const isInc = t.type === "INCOME";
                const isTransfer = t.type === "SELF_TRANSFER";
                return (
                  <tr key={t.id} className="border-b border-subtle/60 transition-colors hover:bg-[rgb(var(--tint-rgb)/0.025)]">
                    <td className="py-3 pr-4 whitespace-nowrap text-secondary">{formatDateDisplay(t.date)}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={isInc ? "success" : isTransfer ? "accent" : "danger"}>
                        {isInc ? "Income" : isTransfer ? "Self Transfer" : "Expense"}
                      </Badge>
                    </td>
                    <td
                      className={`py-3 pr-4 font-medium whitespace-nowrap tabular-nums ${
                        isInc ? "text-emerald-300" : isTransfer ? "text-indigo-300" : "text-rose-300"
                      }`}
                    >
                      {isInc ? "+" : isTransfer ? "" : "-"}
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="py-3 pr-4 text-primary">{t.purpose}</td>
                    <td className="py-3 pr-4 text-secondary">{t.category}</td>
                    <td className="py-3 pr-4 text-secondary">{t.medium ?? "—"}</td>
                    <td className="py-3 pr-4 text-secondary">{sourceDisplay(t)}</td>
                    <td className="py-3 pr-4 text-secondary">{creditDisplay(t)}</td>
                    <td className="py-3 pr-4 text-secondary">{t.destination || "—"}</td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(t)}
                          aria-label="Edit transaction"
                          title="Edit"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-indigo-500/10 hover:text-indigo-300"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id)}
                          aria-label="Delete transaction"
                          title="Delete"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <EmptyState
              icon={<InboxIcon className="h-6 w-6" />}
              title="No transactions yet"
              description="Add your first expense or income above."
            />
          )}
        </div>

        {sorted.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-4">
            <p className="text-xs text-tertiary">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                <ChevronLeftIcon className="h-3.5 w-3.5" />
                Prev
              </Button>
              <span className="text-xs text-secondary">
                Page {safePage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                Next
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

const filterSelectClass =
  "rounded-lg border border-default bg-surface-2 px-2.5 py-1.5 text-sm text-primary transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20";
