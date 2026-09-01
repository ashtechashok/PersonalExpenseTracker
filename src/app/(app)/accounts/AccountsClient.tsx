"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { createAccount, updateAccount, deleteAccount } from "./actions";
import { Card, cardClassName } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Field, Select, inputClass } from "@/components/ui/Field";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  LandmarkIcon,
  CreditCardIcon,
  WalletIcon,
  BanknoteIcon,
  SmartphoneIcon,
} from "@/components/ui/icons";
import { formatCurrency as formatCurrencyShared, currencySymbol } from "@/lib/format";
import { useSettings } from "@/lib/settings-context";

export type ClientAccount = {
  id: string;
  name: string;
  type: "BANK" | "CREDIT" | "PREPAID" | "CASH" | "WALLET";
  // A free-text per-user label (see the Account Roles tab on /settings) —
  // not a fixed set of values.
  role: string;
  balance: number;
  available: number | null;
  // This account's own raw credit limit, as stored (null for an add-on card).
  creditLimit: number | null;
  // The limit actually in effect — own, or (for an add-on) the parent's.
  resolvedCreditLimit: number | null;
  addOnOfAccountId: string | null;
  addOnOfAccountName: string | null;
  hasAddOnCards: boolean;
  includeInAvailableBalance: boolean;
};

type FormState = {
  id: string | null;
  name: string;
  type: "BANK" | "CREDIT" | "PREPAID" | "CASH" | "WALLET";
  role: string;
  currentBalance: string;
  creditLimit: string;
  isAddOn: boolean;
  addOnOfAccountId: string;
  includeInAvailableBalance: boolean;
};

function emptyForm(defaultRole: string): FormState {
  return {
    id: null,
    name: "",
    type: "BANK",
    role: defaultRole,
    currentBalance: "0",
    creditLimit: "",
    isAddOn: false,
    addOnOfAccountId: "",
    includeInAvailableBalance: true,
  };
}

const TYPE_ICONS = {
  BANK: LandmarkIcon,
  CREDIT: CreditCardIcon,
  PREPAID: WalletIcon,
  CASH: BanknoteIcon,
  WALLET: SmartphoneIcon,
} as const;

export default function AccountsClient({ accounts, accountRoles }: { accounts: ClientAccount[]; accountRoles: string[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  const settings = useSettings();
  const formatCurrency = (n: number) => formatCurrencyShared(n, settings);
  const currency = currencySymbol(settings);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(accountRoles[0] ?? "General"));
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isEditing = form.id !== null;
  const isCredit = form.type === "CREDIT";
  // Any root credit card (not itself an add-on) other than the one being
  // edited — a root can have any number of add-on cards attached to it, but
  // only one level of nesting is allowed.
  const parentOptions = accounts.filter((a) => a.type === "CREDIT" && a.id !== form.id && !a.addOnOfAccountId);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAddForm() {
    setForm(emptyForm(accountRoles[0] ?? "General"));
    setFormError(null);
    setShowForm(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function openEditForm(a: ClientAccount) {
    setForm({
      id: a.id,
      name: a.name,
      type: a.type,
      role: a.role,
      currentBalance: String(a.balance),
      creditLimit: a.creditLimit != null ? String(a.creditLimit) : "",
      isAddOn: a.addOnOfAccountId != null,
      addOnOfAccountId: a.addOnOfAccountId ?? "",
      includeInAvailableBalance: a.includeInAvailableBalance,
    });
    setFormError(null);
    setShowForm(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function closeForm() {
    setShowForm(false);
    setForm(emptyForm(accountRoles[0] ?? "General"));
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const currentBalance = parseFloat(form.currentBalance);
    if (!Number.isFinite(currentBalance)) {
      setFormError("Enter a valid balance.");
      return;
    }
    const creditLimit = form.creditLimit.trim() === "" ? null : parseFloat(form.creditLimit);
    if (!form.isAddOn && creditLimit !== null && (!Number.isFinite(creditLimit) || creditLimit <= 0)) {
      setFormError("Credit limit must be a positive number, or left blank.");
      return;
    }
    if (isCredit && form.isAddOn && !form.addOnOfAccountId) {
      setFormError("Choose the card whose credit limit this add-on card shares.");
      return;
    }

    const input = {
      name: form.name.trim(),
      type: form.type,
      role: form.role,
      currentBalance,
      creditLimit: form.isAddOn ? null : creditLimit,
      addOnOfAccountId: isCredit && form.isAddOn ? form.addOnOfAccountId : null,
      includeInAvailableBalance: form.includeInAvailableBalance,
    };

    setPending(true);
    const result = isEditing ? await updateAccount(form.id as string, input) : await createAccount(input);
    setPending(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }
    toast.success(isEditing ? "Account updated" : "Account added");
    closeForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: "Delete this account?", confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    const result = await deleteAccount(id);
    if (result.error) toast.error(result.error);
    else toast.success("Account deleted");
    router.refresh();
  }

  return (
    <div className="space-y-6" ref={formRef}>
      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-primary">Accounts &amp; Cards</h2>
          {!showForm && (
            <Button type="button" variant="secondary" size="sm" onClick={openAddForm}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add Account
            </Button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-5 animate-slide-up space-y-4 rounded-xl border border-default bg-surface-2 p-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Account Name">
                <input
                  type="text"
                  placeholder="e.g. Main Bank (Salary)"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Type">
                <Select value={form.type} onChange={(e) => update("type", e.target.value as FormState["type"])} required>
                  <option value="BANK">Bank Account</option>
                  <option value="CREDIT">Credit Card</option>
                  <option value="PREPAID">Prepaid Card</option>
                  <option value="CASH">Cash</option>
                  <option value="WALLET">Wallet</option>
                </Select>
              </Field>
              <Field
                label="Role"
                hint='Purely a label — use the checkbox below to control what counts towards "Available Balance." Every role also gets its own separate Dashboard total regardless. Manage your roles from the Account Roles tab in Settings.'
              >
                <Select value={form.role} onChange={(e) => update("role", e.target.value)} required>
                  {accountRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={isCredit ? `Current Outstanding (${currency})` : `Current Balance (${currency})`}>
                <input
                  type="number"
                  step="0.01"
                  value={form.currentBalance}
                  onChange={(e) => update("currentBalance", e.target.value)}
                  className={inputClass}
                />
              </Field>
              {isCredit && !form.isAddOn && (
                <Field label={`Credit Limit (${currency}) (optional)`}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 50000"
                    value={form.creditLimit}
                    onChange={(e) => update("creditLimit", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              )}
              {isCredit && form.isAddOn && (
                <Field label="Shares Credit Limit With">
                  <Select
                    value={form.addOnOfAccountId}
                    onChange={(e) => update("addOnOfAccountId", e.target.value)}
                    required
                  >
                    <option value="">Select card…</option>
                    {parentOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>

            {isCredit && (
              <label className="flex items-center gap-2 text-sm text-secondary">
                <input
                  type="checkbox"
                  checked={form.isAddOn}
                  onChange={(e) => update("isAddOn", e.target.checked)}
                  className="h-4 w-4 rounded border-default bg-surface-2 accent-indigo-500"
                />
                Add-On Card (shares another card&apos;s credit limit instead of having its own)
              </label>
            )}

            {!isCredit && (
              <label className="flex items-center gap-2 text-sm text-secondary">
                <input
                  type="checkbox"
                  checked={form.includeInAvailableBalance}
                  onChange={(e) => update("includeInAvailableBalance", e.target.checked)}
                  className="h-4 w-4 rounded border-default bg-surface-2 accent-indigo-500"
                />
                Count Towards Available Balance
              </label>
            )}

            {formError && (
              <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {formError}
              </p>
            )}

            <div className="flex gap-3">
              <Button type="submit" variant="primary" loading={pending}>
                {pending ? "Saving…" : isEditing ? "Save Changes" : "Add Account"}
              </Button>
              <Button type="button" variant="ghost" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
          {accounts.map((a) => {
            const Icon = TYPE_ICONS[a.type];
            const utilization =
              a.type === "CREDIT" && a.resolvedCreditLimit && a.available != null
                ? Math.min(100, Math.max(0, ((a.resolvedCreditLimit - a.available) / a.resolvedCreditLimit) * 100))
                : null;
            return (
              <div
                key={a.id}
                className={`${cardClassName} group flex flex-col gap-3 p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-elevated`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--tint-rgb)/0.05)] text-secondary">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-primary">{a.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge tone={typeTone(a.type)}>{ACCOUNT_TYPE_LABELS[a.type]}</Badge>
                        {a.role !== "General" && <Badge tone={roleTone(a.role)}>{a.role}</Badge>}
                        {a.addOnOfAccountName && <Badge tone="neutral">Add-on of {a.addOnOfAccountName}</Badge>}
                        {a.hasAddOnCards && <Badge tone="neutral">Shared limit</Badge>}
                        {a.type !== "CREDIT" && !a.includeInAvailableBalance && (
                          <Badge tone="neutral">Excluded from Available</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => openEditForm(a)}
                      aria-label="Edit account"
                      title="Edit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-indigo-500/10 hover:text-indigo-300"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      aria-label="Delete account"
                      title="Delete"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xs text-tertiary">{a.type === "CREDIT" ? "Outstanding" : "Balance"}</p>
                    <p className={`text-lg font-semibold tabular-nums ${a.balance < 0 ? "text-rose-300" : "text-primary"}`}>
                      {formatCurrency(a.balance)}
                    </p>
                  </div>
                  {/* Only credit cards have an "Available" distinct from Balance
                      (limit minus outstanding) — for bank/prepaid accounts the
                      two numbers are always identical, so showing both is noise. */}
                  {a.type === "CREDIT" && (
                    <div className="text-right">
                      <p className="text-xs text-tertiary">Available</p>
                      <p className="text-sm font-medium tabular-nums text-secondary">
                        {a.available != null ? formatCurrency(a.available) : "—"}
                      </p>
                    </div>
                  )}
                </div>

                {utilization != null && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--tint-rgb)/0.06)]">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${
                        utilization > 85 ? "bg-rose-400" : utilization > 60 ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                      style={{ width: `${utilization}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function typeTone(type: string): BadgeTone {
  if (type === "CREDIT") return "violet";
  if (type === "PREPAID") return "warning";
  if (type === "CASH") return "success";
  if (type === "WALLET") return "teal";
  return "accent";
}

// Cosmetic-only tone hints for the seeded default role names — any other
// (including a user's own custom role) just falls back to neutral.
function roleTone(role: string): BadgeTone {
  if (role === "Emergency Fund") return "teal";
  if (role === "Salary Account") return "accent";
  if (role === "Expense Account") return "warning";
  if (role === "Investment") return "violet";
  if (role === "Retirement Fund" || role === "SSA") return "success";
  return "neutral";
}
