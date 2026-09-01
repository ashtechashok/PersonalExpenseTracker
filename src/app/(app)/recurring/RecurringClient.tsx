"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  markPaid,
  cancelPeriod,
  undoCancelPeriod,
  undoMarkPaid,
} from "./actions";
import { formatCurrency as formatCurrencyShared, formatDateOnly, currencySymbol } from "@/lib/format";
import { useSettings } from "@/lib/settings-context";
import { Card, cardClassName } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Select, inputClass } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { PlusIcon, ChevronDownIcon, RepeatIcon, UndoIcon, CheckIcon } from "@/components/ui/icons";

export type ClientAccount = { id: string; name: string; type: "BANK" | "CREDIT" | "PREPAID" | "CASH" | "WALLET" };

export type ClientTemplate = {
  id: string;
  name: string;
  type: "EXPENSE" | "INCOME" | "SELF_TRANSFER";
  amount: number;
  category: string;
  medium: string | null;
  accountId: string;
  accountName: string;
  destinationAccountId: string | null;
  destinationAccountName: string | null;
  frequency: "MONTHLY" | "QUARTERLY" | "YEARLY";
  dayOfMonth: number;
  dueMonth: number | null;
  startDate: string | null;
  endDate: string | null;
  rangeStatus: "UPCOMING" | "IN_RANGE" | "ENDED";
  isActive: boolean;
  isDueSoon: boolean;
  nextPeriodStartDate: string | null;
  currentPeriod: {
    status: "PENDING" | "PAID" | "SKIPPED";
    paidDate: string | null;
    paidAccountName: string | null;
    paidDestinationName: string | null;
  };
  history: { date: string; accountName: string | null; destinationName: string | null }[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const FREQUENCY_LABELS: Record<ClientTemplate["frequency"], string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

function dueHint(t: ClientTemplate) {
  if (t.frequency === "YEARLY") return `~${ordinal(t.dayOfMonth)} ${MONTH_NAMES[(t.dueMonth ?? 1) - 1]}`;
  if (t.frequency === "QUARTERLY") return `~${ordinal(t.dayOfMonth)} of quarter (Mar/Jun/Sep/Dec)`;
  return `~${ordinal(t.dayOfMonth)} of month`;
}

// Surfaces what still needs action at the top, sinks what's already
// resolved to the bottom: due-now-and-pending, then pending-not-yet-due,
// then cancelled, then paid, then paused/ended (nothing to do either way).
function sortPriority(t: ClientTemplate): number {
  if (!t.isActive || t.rangeStatus === "ENDED") return 5;
  if (t.currentPeriod.status === "PAID") return 4;
  if (t.currentPeriod.status === "SKIPPED") return 3;
  return t.rangeStatus === "IN_RANGE" && t.isDueSoon ? 1 : 2;
}

type FormState = {
  id: string | null;
  name: string;
  type: "EXPENSE" | "INCOME" | "SELF_TRANSFER";
  amount: string;
  category: string;
  medium: string;
  accountId: string;
  destinationAccountId: string;
  frequency: "MONTHLY" | "QUARTERLY" | "YEARLY";
  dayOfMonth: string;
  dueMonth: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

function emptyForm(defaultCategory: string, defaultMedium: string): FormState {
  return {
    id: null,
    name: "",
    type: "EXPENSE",
    amount: "",
    category: defaultCategory,
    medium: defaultMedium,
    accountId: "",
    destinationAccountId: "",
    frequency: "MONTHLY",
    dayOfMonth: "1",
    dueMonth: "1",
    startDate: "",
    endDate: "",
    isActive: true,
  };
}

export default function RecurringClient({
  templates,
  accounts,
  categories,
  mediums,
}: {
  templates: ClientTemplate[];
  accounts: ClientAccount[];
  categories: { expense: string[]; income: string[] };
  mediums: string[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const settings = useSettings();
  const formatCurrency = (n: number) => formatCurrencyShared(n, settings);
  const formatDateDisplay = (iso: string) => formatDateOnly(iso, settings);
  const currency = currencySymbol(settings);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(categories.expense[0] ?? "", mediums[0] ?? ""));
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (showForm) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showForm]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [overrideFor, setOverrideFor] = useState<string | null>(null);
  const [overrideAccountId, setOverrideAccountId] = useState("");
  const [overrideAmount, setOverrideAmount] = useState("");
  const [overrideDate, setOverrideDate] = useState(todayIso());
  const [rowError, setRowError] = useState<string | null>(null);
  const [rowPending, setRowPending] = useState(false);

  const isEditing = form.id !== null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onTypeChange(type: "EXPENSE" | "INCOME" | "SELF_TRANSFER") {
    setForm((f) => ({
      ...f,
      type,
      category: type === "EXPENSE" ? (categories.expense[0] ?? "") : type === "INCOME" ? (categories.income[0] ?? "") : "",
    }));
  }

  function openAddForm() {
    setForm(emptyForm(categories.expense[0] ?? "", mediums[0] ?? ""));
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(t: ClientTemplate) {
    setForm({
      id: t.id,
      name: t.name,
      type: t.type,
      amount: String(t.amount),
      category: t.category,
      medium: t.medium ?? mediums[0] ?? "",
      accountId: t.accountId,
      destinationAccountId: t.destinationAccountId ?? "",
      frequency: t.frequency,
      dayOfMonth: String(t.dayOfMonth),
      dueMonth: String(t.dueMonth ?? 1),
      startDate: t.startDate ?? "",
      endDate: t.endDate ?? "",
      isActive: t.isActive,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const amount = parseFloat(form.amount);
    const dayOfMonth = parseInt(form.dayOfMonth, 10);

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter a valid amount.");
      return;
    }
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      setFormError("Enter a day between 1 and 31.");
      return;
    }
    const dueMonth = parseInt(form.dueMonth, 10);
    if (form.frequency === "YEARLY" && (!Number.isInteger(dueMonth) || dueMonth < 1 || dueMonth > 12)) {
      setFormError("Select which month this is due in.");
      return;
    }
    if (!form.accountId) {
      setFormError("Select a default account.");
      return;
    }
    if (form.type === "SELF_TRANSFER" && !form.destinationAccountId) {
      setFormError("Select a destination account to transfer to.");
      return;
    }
    if (form.destinationAccountId && form.destinationAccountId === form.accountId) {
      setFormError("Source and destination accounts must be different.");
      return;
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setFormError("End date must be on or after the start date.");
      return;
    }

    const input = {
      name: form.name.trim(),
      type: form.type,
      amount,
      category: form.category,
      medium: form.type === "EXPENSE" ? form.medium : null,
      accountId: form.accountId,
      destinationAccountId: form.type !== "INCOME" ? form.destinationAccountId || null : null,
      frequency: form.frequency,
      dayOfMonth,
      dueMonth: form.frequency === "YEARLY" ? dueMonth : null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      isActive: form.isActive,
    };

    setPending(true);
    const result = isEditing ? await updateTemplate(form.id as string, input) : await createTemplate(input);
    setPending(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }
    toast.success(isEditing ? "Recurring item updated" : "Recurring item added");
    setForm(emptyForm(categories.expense[0] ?? "", mediums[0] ?? ""));
    setShowForm(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Delete this recurring item?",
      description: "Already-logged transactions stay in your ledger — only the template and its cancelled-period record are removed.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    await deleteTemplate(id);
    toast.success("Recurring item deleted");
    router.refresh();
  }

  async function handleMarkPaid(id: string) {
    setRowPending(true);
    const result = await markPaid(id);
    setRowPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Marked paid");
    router.refresh();
  }

  function openOverrideForm(t: ClientTemplate, defaultDate: string = todayIso()) {
    setOverrideFor(t.id);
    setOverrideAccountId(t.accountId);
    setOverrideAmount(String(t.amount));
    setOverrideDate(defaultDate);
    setRowError(null);
  }

  async function handleConfirmOverride(id: string) {
    if (!overrideAccountId) {
      setRowError("Select an account.");
      return;
    }
    const amount = parseFloat(overrideAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setRowError("Enter a valid amount.");
      return;
    }
    if (!overrideDate) {
      setRowError("Select a date.");
      return;
    }
    setRowPending(true);
    const result = await markPaid(id, overrideAccountId, amount, overrideDate);
    setRowPending(false);
    if (result.error) {
      setRowError(result.error);
      return;
    }
    setOverrideFor(null);
    toast.success("Marked paid");
    router.refresh();
  }

  async function handleCancel(id: string) {
    const ok = await confirm({
      title: "Cancel this period?",
      description: "No transaction will be created for this period. You can undo this anytime before the period ends.",
      confirmLabel: "Cancel Period",
      tone: "danger",
    });
    if (!ok) return;
    const result = await cancelPeriod(id);
    if (result.error) toast.error(result.error);
    else toast.success("Period cancelled");
    router.refresh();
  }

  async function handleUndoCancel(id: string) {
    const result = await undoCancelPeriod(id);
    if (result.error) toast.error(result.error);
    router.refresh();
  }

  async function handleUndoPaid(id: string) {
    const ok = await confirm({
      title: "Undo this?",
      description: "The matching transaction will be deleted.",
      confirmLabel: "Undo",
      tone: "danger",
    });
    if (!ok) return;
    const result = await undoMarkPaid(id);
    if (result.error) toast.error(result.error);
    router.refresh();
  }

  const categoryOptions = form.type === "INCOME" ? categories.income : categories.expense;

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-primary">Recurring Transactions</h2>
          {!showForm && (
            <Button type="button" variant="secondary" size="sm" onClick={openAddForm}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add Recurring
            </Button>
          )}
        </div>

        {showForm && (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="mb-5 animate-slide-up space-y-4 rounded-xl border border-default bg-surface-2 p-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input
                  type="text"
                  placeholder="e.g. Rent, Netflix, Salary"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>

              <Field label="Type">
                <Select
                  value={form.type}
                  onChange={(e) => onTypeChange(e.target.value as "EXPENSE" | "INCOME" | "SELF_TRANSFER")}
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                  <option value="SELF_TRANSFER">Self Transfer</option>
                </Select>
              </Field>

              <Field label={`Amount (${currency})`}>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 12000"
                  value={form.amount}
                  onChange={(e) => update("amount", e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>

              {form.type !== "SELF_TRANSFER" && (
                <Field label="Category">
                  <Select value={form.category} onChange={(e) => update("category", e.target.value)}>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {form.type === "EXPENSE" && (
                <Field label="Medium">
                  <Select value={form.medium} onChange={(e) => update("medium", e.target.value)}>
                    {mediums.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              <Field label={form.type === "INCOME" ? "Default Credit Account" : "Default Source Account"}>
                <Select value={form.accountId} onChange={(e) => update("accountId", e.target.value)} required>
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {form.type !== "INCOME" && (
                <Field
                  label={
                    form.type === "SELF_TRANSFER"
                      ? "Destination Account"
                      : "Also Credit To Account (optional — e.g. a savings or Emergency Fund account)"
                  }
                >
                  <Select
                    value={form.destinationAccountId}
                    onChange={(e) => update("destinationAccountId", e.target.value)}
                    required={form.type === "SELF_TRANSFER"}
                  >
                    <option value="">{form.type === "SELF_TRANSFER" ? "Select account" : "None (external expense)"}</option>
                    {accounts
                      .filter((a) => a.id !== form.accountId)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </Select>
                </Field>
              )}

              <Field label="Frequency">
                <Select value={form.frequency} onChange={(e) => update("frequency", e.target.value as FormState["frequency"])}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </Select>
              </Field>

              {form.frequency === "YEARLY" && (
                <Field label="Due Month">
                  <Select value={form.dueMonth} onChange={(e) => update("dueMonth", e.target.value)}>
                    {MONTH_NAMES.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              <Field
                label={
                  form.frequency === "MONTHLY"
                    ? "Usually Due Around (day of month)"
                    : form.frequency === "QUARTERLY"
                      ? "Usually Due Around (day of the quarter's last month)"
                      : "Usually Due Around (day of the month above)"
                }
              >
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="31"
                  value={form.dayOfMonth}
                  onChange={(e) => update("dayOfMonth", e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>

              <Field label="Starts On (optional — for a fixed-term item)">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Ends On (optional — for a fixed-term item)">
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <div className="flex flex-col justify-end gap-2 pb-2">
                <label className="flex items-center gap-2 text-sm font-medium text-secondary">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => update("isActive", e.target.checked)}
                    className="h-4 w-4 rounded border-default bg-surface-2 accent-indigo-500"
                  />
                  Active (show as due each month)
                </label>
              </div>
            </div>

            <p className="text-xs text-tertiary">
              The due date above is just a reminder — whenever you mark it paid, the real transaction is dated that
              day, not this one, so paying early or late never throws off your balances.
            </p>

            {formError && (
              <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {formError}
              </p>
            )}

            <div className="flex gap-3">
              <Button type="submit" variant="primary" loading={pending}>
                {pending ? "Saving…" : isEditing ? "Save Changes" : "Add Recurring"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm(categories.expense[0] ?? "", mediums[0] ?? ""));
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {[...templates].sort((a, b) => sortPriority(a) - sortPriority(b)).map((t) => {
            const isExpanded = expandedId === t.id;
            const { status } = t.currentPeriod;
            return (
              <div key={t.id} className={`${cardClassName} overflow-hidden !bg-surface-2`}>
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    className="flex flex-1 flex-wrap items-center gap-3 text-left"
                  >
                    <ChevronDownIcon
                      className={`h-4 w-4 shrink-0 text-tertiary transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                    <span className="font-semibold text-primary">{t.name}</span>
                    <Badge tone={t.type === "EXPENSE" ? "danger" : t.type === "INCOME" ? "success" : "accent"}>
                      {t.type === "EXPENSE" ? "Expense" : t.type === "INCOME" ? "Income" : "Self Transfer"}
                    </Badge>
                    {t.frequency !== "MONTHLY" && <Badge tone="neutral">{FREQUENCY_LABELS[t.frequency]}</Badge>}
                    {!t.isActive && <Badge tone="neutral">Paused</Badge>}
                    {t.isActive && t.rangeStatus === "IN_RANGE" && t.currentPeriod.status === "PENDING" && t.isDueSoon && (
                      <Badge tone="warning">Due</Badge>
                    )}
                    <span className="text-sm text-secondary">
                      {formatCurrency(t.amount)} · {t.category} · {t.accountName}
                      {t.destinationAccountName ? ` → ${t.destinationAccountName}` : ""}
                    </span>
                    <span className="text-sm text-tertiary">
                      {dueHint(t)}
                      {t.startDate ? ` · Starts ${formatDateDisplay(t.startDate)}` : ""}
                      {t.endDate ? ` · Ends ${formatDateDisplay(t.endDate)}` : ""}
                    </span>
                  </button>
                  <div className="flex items-center gap-2">
                    {status === "PAID" && (
                      <span
                        title="Paid for this period"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEditForm(t)}>
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="text-rose-300 hover:bg-rose-500/10">
                      Delete
                    </Button>
                  </div>
                </div>

                {t.isActive && t.rangeStatus === "ENDED" && (
                  <div className="border-t border-subtle px-3 py-3 text-sm text-tertiary sm:px-4">
                    Ended {t.endDate && formatDateDisplay(t.endDate)} — no longer due.
                  </div>
                )}

                {t.isActive && t.rangeStatus !== "ENDED" && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-subtle px-3 py-3 sm:px-4">
                    {t.rangeStatus === "UPCOMING" && status === "PENDING" && (
                      <span className="w-full text-sm text-tertiary">
                        Starts {t.startDate && formatDateDisplay(t.startDate)} — not due yet, but you can still log it
                        early below.
                      </span>
                    )}
                    {overrideFor === t.id ? (
                      <>
                        <input
                          type="number"
                          step="0.01"
                          value={overrideAmount}
                          onChange={(e) => setOverrideAmount(e.target.value)}
                          className="w-28 rounded-lg border border-default bg-surface-3 px-2 py-1 text-sm text-primary"
                        />
                        <input
                          type="date"
                          value={overrideDate}
                          onChange={(e) => setOverrideDate(e.target.value)}
                          className="rounded-lg border border-default bg-surface-3 px-2 py-1 text-sm text-primary"
                        />
                        <select
                          value={overrideAccountId}
                          onChange={(e) => setOverrideAccountId(e.target.value)}
                          className="rounded-lg border border-default bg-surface-3 px-2 py-1 text-sm text-primary"
                        >
                          <option value="">Select account</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          loading={rowPending}
                          onClick={() => handleConfirmOverride(t.id)}
                        >
                          Confirm
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setOverrideFor(null)}>
                          Cancel
                        </Button>
                        {rowError && <span className="text-xs text-rose-300">{rowError}</span>}
                      </>
                    ) : status === "PAID" ? (
                      <>
                        <span className="text-sm text-emerald-300">
                          Paid {t.currentPeriod.paidDate && formatDateDisplay(t.currentPeriod.paidDate)}
                          {t.currentPeriod.paidAccountName ? ` from ${t.currentPeriod.paidAccountName}` : ""}
                          {t.currentPeriod.paidDestinationName ? ` → ${t.currentPeriod.paidDestinationName}` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUndoPaid(t.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-tertiary hover:text-secondary"
                        >
                          <UndoIcon className="h-3 w-3" />
                          Undo
                        </button>
                        {t.nextPeriodStartDate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openOverrideForm(t, t.nextPeriodStartDate as string)}
                          >
                            Pay Next Period Early
                          </Button>
                        )}
                      </>
                    ) : status === "SKIPPED" ? (
                      <>
                        <span className="text-sm text-tertiary">Cancelled this period — no transaction created</span>
                        <button
                          type="button"
                          onClick={() => handleUndoCancel(t.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-tertiary hover:text-secondary"
                        >
                          <UndoIcon className="h-3 w-3" />
                          Undo
                        </button>
                        {t.nextPeriodStartDate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openOverrideForm(t, t.nextPeriodStartDate as string)}
                          >
                            Pay Next Period Early
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <Button type="button" variant="primary" size="sm" loading={rowPending} onClick={() => handleMarkPaid(t.id)}>
                          Mark Paid
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => openOverrideForm(t)}>
                          Edit &amp; Pay
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(t.id)}
                          className="text-rose-300 hover:bg-rose-500/10"
                        >
                          Cancel This Period
                        </Button>
                      </>
                    )}
                  </div>
                )}

                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <div className="overflow-x-auto border-t border-subtle">
                      {t.history.length > 0 ? (
                        <table className="w-full min-w-[360px] border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-subtle text-left text-xs font-semibold tracking-wide text-tertiary uppercase">
                              <th className="py-2 pr-4 pl-3 sm:pl-4">Date</th>
                              <th className="py-2 pr-4">Account</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.history.map((h) => (
                              <tr key={h.date} className="border-b border-subtle/60">
                                <td className="py-2 pr-4 pl-3 text-secondary whitespace-nowrap sm:pl-4">{formatDateDisplay(h.date)}</td>
                                <td className="py-2 pr-4 text-secondary">
                                  {h.accountName ?? "—"}
                                  {h.destinationName ? ` → ${h.destinationName}` : ""}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="p-3 text-sm text-tertiary sm:p-4">No occurrences logged yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {templates.length === 0 && (
            <EmptyState
              icon={<RepeatIcon className="h-6 w-6" />}
              title="No recurring items yet"
              description="Add rent, subscriptions, or salary above — mark each one paid whenever it actually happens."
            />
          )}
        </div>
      </Card>
    </div>
  );
}
