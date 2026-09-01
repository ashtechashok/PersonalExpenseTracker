"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createEmi,
  updateEmi,
  deleteEmi,
  markInstallmentReceived,
  markInstallmentPaid,
  undoInstallmentReceipt,
} from "./actions";
import { Card, cardClassName } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Select, inputClass } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { PlusIcon, ChevronDownIcon, HandCoinsIcon, UndoIcon, EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { formatCurrency as formatCurrencyShared, formatDateOnly, currencySymbol } from "@/lib/format";
import { useSettings } from "@/lib/settings-context";

export type ClientAccount = { id: string; name: string; type: "BANK" | "CREDIT" | "PREPAID" | "CASH" | "WALLET" };

export type ClientInstallment = {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  receivedDate: string | null;
  receivedAccountName: string | null;
};

export type ClientEmi = {
  id: string;
  totalAmount: number;
  monthlyAmount: number;
  periodMonths: number;
  person: string;
  isOwn: boolean;
  isOneTime: boolean;
  startDate: string;
  locked: boolean;
  cardAccountId: string | null;
  cardAccountName: string | null;
  deductedDate: string | null;
  deductedAccountName: string | null;
  installments: ClientInstallment[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// Fully done: every installment has been received/paid — nothing left to
// act on. Hidden from the main list by default so finished EMIs don't
// clutter it; still viewable via the "Show Completed" toggle.
function isEmiCompleted(emi: ClientEmi) {
  return emi.installments.length > 0 && emi.installments.every((i) => i.receivedDate);
}

type FormState = {
  id: string | null;
  totalAmount: string;
  monthlyAmount: string;
  periodMonths: string;
  person: string;
  isOwn: boolean;
  isOneTime: boolean;
  startDate: string;
  deductAccountId: string;
  cardAccountId: string;
};

function emptyForm(): FormState {
  return {
    id: null,
    totalAmount: "",
    monthlyAmount: "",
    periodMonths: "",
    person: "",
    isOwn: false,
    isOneTime: false,
    startDate: todayIso(),
    deductAccountId: "",
    cardAccountId: "",
  };
}

export default function EmiClient({
  emis,
  accounts,
  yetToReceive,
}: {
  emis: ClientEmi[];
  accounts: ClientAccount[];
  yetToReceive: number;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const settings = useSettings();
  const formatCurrency = (n: number) => formatCurrencyShared(n, settings);
  const formatDateDisplay = (iso: string) => formatDateOnly(iso, settings);
  const currency = currencySymbol(settings);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (showForm) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showForm]);

  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [receivingInstallmentId, setReceivingInstallmentId] = useState<string | null>(null);
  const [receiveAccountId, setReceiveAccountId] = useState("");
  const [rowError, setRowError] = useState<string | null>(null);
  const [rowPending, setRowPending] = useState(false);

  const isEditing = form.id !== null;
  const editingEmi = form.id ? emis.find((e) => e.id === form.id) : null;
  const fieldsLocked = !!editingEmi?.locked;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAddForm() {
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(emi: ClientEmi) {
    setForm({
      id: emi.id,
      totalAmount: String(emi.totalAmount),
      monthlyAmount: String(emi.monthlyAmount),
      periodMonths: String(emi.periodMonths),
      person: emi.person,
      isOwn: emi.isOwn,
      isOneTime: emi.isOneTime,
      startDate: emi.startDate,
      deductAccountId: "",
      cardAccountId: emi.cardAccountId ?? "",
    });
    setFormError(null);
    setShowForm(true);
  }

  function onOneTimeChange(checked: boolean) {
    setForm((f) => ({ ...f, isOneTime: checked, isOwn: checked ? false : f.isOwn }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const totalAmount = parseFloat(form.totalAmount);
    const monthlyAmount = form.isOneTime ? totalAmount : parseFloat(form.monthlyAmount);
    const periodMonths = form.isOneTime ? 1 : parseInt(form.periodMonths, 10);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setFormError("Enter a valid total amount.");
      return;
    }
    if (!form.isOneTime && (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0)) {
      setFormError("Enter a valid monthly EMI amount.");
      return;
    }
    if (!form.isOneTime && (!Number.isInteger(periodMonths) || periodMonths < 1)) {
      setFormError("Enter a valid EMI period (in months).");
      return;
    }
    if (form.isOneTime && !form.deductAccountId && !fieldsLocked) {
      setFormError("Select an account to deduct from.");
      return;
    }

    const input = {
      totalAmount,
      monthlyAmount,
      periodMonths,
      person: form.person.trim(),
      isOwn: form.isOwn,
      isOneTime: form.isOneTime,
      startDate: form.startDate,
      deductAccountId: form.deductAccountId || null,
      cardAccountId: form.isOneTime ? null : form.cardAccountId || null,
    };

    setPending(true);
    const result = isEditing ? await updateEmi(form.id as string, input) : await createEmi(input);
    setPending(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }
    toast.success(isEditing ? "EMI updated" : "EMI added");
    setForm(emptyForm());
    setShowForm(false);
    router.refresh();
  }

  async function handleDeleteEmi(id: string) {
    const ok = await confirm({
      title: "Delete this EMI?",
      description: "Its installment schedule will be removed. Any already-recorded deduction/repayment transactions stay in your ledger.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    await deleteEmi(id);
    toast.success("EMI deleted");
    router.refresh();
  }

  function openReceiveForm(installmentId: string) {
    setReceivingInstallmentId(installmentId);
    setReceiveAccountId("");
    setRowError(null);
  }

  async function handleMarkReceived(installmentId: string) {
    if (!receiveAccountId) {
      setRowError("Select an account to receive into.");
      return;
    }
    setRowPending(true);
    const result = await markInstallmentReceived(installmentId, receiveAccountId);
    setRowPending(false);
    if (result.error) {
      setRowError(result.error);
      return;
    }
    setReceivingInstallmentId(null);
    toast.success("Marked received");
    router.refresh();
  }

  async function handleMarkPaid(installmentId: string) {
    if (!receiveAccountId) {
      setRowError("Select an account to pay from.");
      return;
    }
    setRowPending(true);
    const result = await markInstallmentPaid(installmentId, receiveAccountId);
    setRowPending(false);
    if (result.error) {
      setRowError(result.error);
      return;
    }
    setReceivingInstallmentId(null);
    toast.success("Marked paid");
    router.refresh();
  }

  async function handleUndo(installmentId: string) {
    const ok = await confirm({
      title: "Undo this?",
      description: "The matching transaction will be deleted.",
      confirmLabel: "Undo",
      tone: "danger",
    });
    if (!ok) return;
    const result = await undoInstallmentReceipt(installmentId);
    if (result.error) toast.error(result.error);
    router.refresh();
  }

  const completedCount = emis.filter(isEmiCompleted).length;
  const visibleEmis = showCompleted ? emis : emis.filter((e) => !isEmiCompleted(e));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-secondary">Yet to Receive</span>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
              <HandCoinsIcon className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-xl font-semibold tabular-nums text-amber-300">{formatCurrency(yetToReceive)}</div>
        </Card>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-primary">EMIs</h2>
          <div className="flex items-center gap-2">
            {completedCount > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowCompleted((v) => !v)}>
                {showCompleted ? <EyeOffIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
                {showCompleted ? "Hide Completed" : `Show Completed (${completedCount})`}
              </Button>
            )}
            {!showForm && (
              <Button type="button" variant="secondary" size="sm" onClick={openAddForm}>
                <PlusIcon className="h-3.5 w-3.5" />
                Add EMI
              </Button>
            )}
          </div>
        </div>

        {showForm && (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="mb-5 animate-slide-up space-y-4 rounded-xl border border-default bg-surface-2 p-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={`Total Amount (${currency})`}>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 60000"
                  value={form.totalAmount}
                  onChange={(e) => update("totalAmount", e.target.value)}
                  className={inputClass}
                  disabled={fieldsLocked}
                  required
                />
              </Field>

              {!form.isOneTime && (
                <>
                  <Field label={`Monthly EMI (${currency})`}>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5000"
                      value={form.monthlyAmount}
                      onChange={(e) => update("monthlyAmount", e.target.value)}
                      className={inputClass}
                      disabled={fieldsLocked}
                      required
                    />
                  </Field>
                  <Field label="EMI Period (months)">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="e.g. 12"
                      value={form.periodMonths}
                      onChange={(e) => update("periodMonths", e.target.value)}
                      className={inputClass}
                      disabled={fieldsLocked}
                      required
                    />
                  </Field>
                  <Field label="Card (optional)">
                    <Select value={form.cardAccountId} onChange={(e) => update("cardAccountId", e.target.value)} disabled={fieldsLocked}>
                      <option value="">Not on a card</option>
                      {accounts
                        .filter((a) => a.type === "CREDIT")
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </Select>
                  </Field>
                </>
              )}

              <Field label="Start Date (first installment)">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                  className={inputClass}
                  disabled={fieldsLocked}
                  required
                />
              </Field>

              <Field label="Person">
                <input
                  type="text"
                  placeholder="e.g. Me / Alex / Sam"
                  value={form.person}
                  onChange={(e) => update("person", e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>

              {form.isOneTime && (
                <Field label="Deduct From Account">
                  <Select
                    value={form.deductAccountId}
                    onChange={(e) => update("deductAccountId", e.target.value)}
                    disabled={fieldsLocked}
                    required={!fieldsLocked}
                  >
                    <option value="">Select account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              <div className="flex flex-col justify-end gap-2 pb-2">
                {!form.isOneTime && (
                  <label className="flex items-center gap-2 text-sm font-medium text-secondary">
                    <input
                      type="checkbox"
                      checked={form.isOwn}
                      onChange={(e) => update("isOwn", e.target.checked)}
                      disabled={fieldsLocked}
                      className="h-4 w-4 rounded border-default bg-surface-2 accent-indigo-500"
                    />
                    Own EMI (not someone else&apos;s)
                  </label>
                )}
                <label className="flex items-center gap-2 text-sm font-medium text-secondary">
                  <input
                    type="checkbox"
                    checked={form.isOneTime}
                    onChange={(e) => onOneTimeChange(e.target.checked)}
                    disabled={fieldsLocked}
                    className="h-4 w-4 rounded border-default bg-surface-2 accent-indigo-500"
                  />
                  One Time (someone borrowed money from me)
                </label>
              </div>
            </div>

            {fieldsLocked && (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                Amount, period, start date and type are locked because money has already moved for this entry —
                delete and recreate it if you need to change those. You can still edit the person&apos;s name.
              </p>
            )}
            {!fieldsLocked && form.isOneTime && (
              <p className="text-xs text-tertiary">
                The total amount is deducted from the chosen account immediately, reducing your Available Balance.
                It counts toward &quot;Yet to Receive&quot; until you mark it received.
              </p>
            )}
            {!fieldsLocked && !form.isOneTime && (
              <p className="text-xs text-tertiary">
                Leave &quot;Own EMI&quot; unchecked when this was for someone else — their pending installments count
                toward &quot;Yet to Receive&quot; until you mark each one received.
                {form.cardAccountId &&
                  " Picking a card blocks the full total amount from that card's available limit right away, for as long as this EMI exists — it doesn't shrink as installments are paid."}
              </p>
            )}

            {formError && (
              <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {formError}
              </p>
            )}

            <div className="flex gap-3">
              <Button type="submit" variant="primary" loading={pending}>
                {pending ? "Saving…" : isEditing ? "Save Changes" : "Add EMI"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm());
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {visibleEmis.map((emi) => {
            const receivedCount = emi.installments.filter((i) => i.receivedDate).length;
            const isExpanded = expandedId === emi.id;
            return (
              <div key={emi.id} className={`${cardClassName} overflow-hidden !bg-surface-2`}>
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : emi.id)}
                    className="flex flex-1 flex-wrap items-center gap-3 text-left"
                  >
                    <ChevronDownIcon
                      className={`h-4 w-4 shrink-0 text-tertiary transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                    <span className="font-semibold text-primary">{emi.person}</span>
                    <Badge tone={emi.isOneTime ? "violet" : emi.isOwn ? "neutral" : "warning"}>
                      {emi.isOneTime ? "One Time" : emi.isOwn ? "Own" : "Other Person"}
                    </Badge>
                    {emi.isOneTime ? (
                      <span className="text-sm text-secondary">
                        One-time loan of {formatCurrency(emi.totalAmount)}
                        {emi.deductedDate &&
                          ` · Deducted ${formatDateDisplay(emi.deductedDate)}${emi.deductedAccountName ? ` from ${emi.deductedAccountName}` : ""}`}
                      </span>
                    ) : (
                      <span className="text-sm text-secondary">
                        {formatCurrency(emi.monthlyAmount)} × {emi.periodMonths} mo · Total{" "}
                        {formatCurrency(emi.totalAmount)}
                        {emi.cardAccountName && ` · ${emi.cardAccountName}`}
                      </span>
                    )}
                    <span className="text-sm text-tertiary">
                      {emi.isOneTime
                        ? receivedCount > 0
                          ? "Repaid"
                          : emi.isOwn
                            ? ""
                            : "Not yet repaid"
                        : `${receivedCount}/${emi.periodMonths} ${emi.isOwn ? "months" : "received"}`}
                    </span>
                  </button>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEditForm(emi)}>
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteEmi(emi.id)} className="text-rose-300 hover:bg-rose-500/10">
                      Delete
                    </Button>
                  </div>
                </div>

                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <div className="overflow-x-auto border-t border-subtle">
                      <table className="w-full min-w-[520px] border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-subtle text-left text-xs font-semibold tracking-wide text-tertiary uppercase">
                            <th className="py-2 pr-4 pl-3 sm:pl-4">#</th>
                            <th className="py-2 pr-4">Due Date</th>
                            <th className="py-2 pr-4">Amount</th>
                            <th className="py-2 pr-4">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emi.installments.map((inst) => (
                            <tr key={inst.id} className="border-b border-subtle/60">
                              <td className="py-2 pr-4 pl-3 text-secondary sm:pl-4">{inst.installmentNumber}</td>
                              <td className="py-2 pr-4 text-secondary whitespace-nowrap">{formatDateDisplay(inst.dueDate)}</td>
                              <td className="py-2 pr-4 tabular-nums text-primary">{formatCurrency(inst.amount)}</td>
                              <td className="py-2 pr-4">
                                {inst.receivedDate ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={emi.isOwn ? "text-secondary" : "text-emerald-300"}>
                                      {emi.isOwn ? "Paid" : "Received"} {formatDateDisplay(inst.receivedDate)}
                                      {inst.receivedAccountName
                                        ? `${emi.isOwn ? " from " : " → "}${inst.receivedAccountName}`
                                        : ""}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUndo(inst.id)}
                                      className="inline-flex items-center gap-1 text-xs font-medium text-tertiary hover:text-secondary"
                                    >
                                      <UndoIcon className="h-3 w-3" />
                                      Undo
                                    </button>
                                  </div>
                                ) : receivingInstallmentId === inst.id ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <select
                                      value={receiveAccountId}
                                      onChange={(e) => setReceiveAccountId(e.target.value)}
                                      className="rounded-lg border border-default bg-surface-3 px-2 py-1 text-sm text-primary"
                                    >
                                      <option value="">Select account</option>
                                      {(emi.isOwn ? accounts.filter((a) => a.type !== "CREDIT") : accounts).map((a) => (
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
                                      onClick={() => (emi.isOwn ? handleMarkPaid(inst.id) : handleMarkReceived(inst.id))}
                                    >
                                      Confirm
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setReceivingInstallmentId(null)}>
                                      Cancel
                                    </Button>
                                    {rowError && <span className="text-xs text-rose-300">{rowError}</span>}
                                  </div>
                                ) : (
                                  <Button type="button" variant="secondary" size="sm" onClick={() => openReceiveForm(inst.id)}>
                                    {emi.isOwn ? "Mark Paid" : "Mark Received"}
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {visibleEmis.length === 0 && emis.length === 0 && (
            <EmptyState
              icon={<HandCoinsIcon className="h-6 w-6" />}
              title="No EMIs yet"
              description="Add your first one above."
            />
          )}
          {visibleEmis.length === 0 && emis.length > 0 && (
            <EmptyState
              icon={<HandCoinsIcon className="h-6 w-6" />}
              title="All caught up"
              description={`Every EMI is completed — click "Show Completed" above to see them.`}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
