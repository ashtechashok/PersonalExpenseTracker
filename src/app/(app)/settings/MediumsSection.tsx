"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createMedium, updateMedium, deleteMedium } from "./mediums-actions";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Select, inputClass } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { PlusIcon, PencilIcon, TrashIcon, InboxIcon } from "@/components/ui/icons";

export type ClientAccount = { id: string; name: string; type: "BANK" | "CREDIT" | "PREPAID" | "CASH" | "WALLET" };

export type ClientMedium = {
  id: string;
  name: string;
  allowedAccountTypes: ("BANK" | "CREDIT" | "PREPAID" | "CASH" | "WALLET")[];
  defaultAccountId: string | null;
  defaultAccountName: string | null;
};

const ACCOUNT_TYPES = ["BANK", "CREDIT", "PREPAID", "CASH", "WALLET"] as const;

type FormState = {
  id: string | null;
  name: string;
  allowedAccountTypes: string[];
  defaultAccountId: string;
};

function emptyForm(): FormState {
  return { id: null, name: "", allowedAccountTypes: [], defaultAccountId: "" };
}

export default function MediumsSection({ mediums, accounts }: { mediums: ClientMedium[]; accounts: ClientAccount[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isEditing = form.id !== null;

  function toggleType(type: string) {
    setForm((f) => ({
      ...f,
      allowedAccountTypes: f.allowedAccountTypes.includes(type)
        ? f.allowedAccountTypes.filter((t) => t !== type)
        : [...f.allowedAccountTypes, type],
    }));
  }

  function openAddForm() {
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function openEditForm(m: ClientMedium) {
    setForm({
      id: m.id,
      name: m.name,
      allowedAccountTypes: m.allowedAccountTypes,
      defaultAccountId: m.defaultAccountId ?? "",
    });
    setFormError(null);
    setShowForm(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function closeForm() {
    setShowForm(false);
    setForm(emptyForm());
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const input = {
      name: form.name.trim(),
      allowedAccountTypes: form.allowedAccountTypes as ("BANK" | "CREDIT" | "PREPAID" | "CASH" | "WALLET")[],
      defaultAccountId: form.defaultAccountId || null,
    };

    setPending(true);
    const result = isEditing ? await updateMedium(form.id as string, input) : await createMedium(input);
    setPending(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }
    toast.success(isEditing ? "Medium updated" : "Medium added");
    closeForm();
    router.refresh();
  }

  async function handleDelete(m: ClientMedium) {
    const ok = await confirm({ title: `Delete "${m.name}"?`, confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    const result = await deleteMedium(m.id);
    if (result.error) toast.error(result.error);
    else toast.success("Medium deleted");
    router.refresh();
  }

  return (
    <div ref={formRef}>
      <Card className="p-4 sm:p-6">
        <p className="mb-4 text-sm text-secondary">
          Your own payment mediums — each can restrict which account types it offers as a source, and pre-select a
          default account.
        </p>

        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-primary">All Mediums</h2>
          {!showForm && (
            <Button type="button" variant="secondary" size="sm" onClick={openAddForm}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add Medium
            </Button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-5 animate-slide-up space-y-4 rounded-xl border border-default bg-surface-2 p-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input
                  type="text"
                  placeholder="e.g. Mobile Wallet"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputClass}
                  maxLength={20}
                  required
                />
              </Field>

              <Field label="Default account" hint="Pre-selected automatically when this medium is picked.">
                <Select
                  value={form.defaultAccountId}
                  onChange={(e) => setForm((f) => ({ ...f, defaultAccountId: e.target.value }))}
                >
                  <option value="">None</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Allowed account types"
                hint="Leave all unchecked to allow any account type as the source."
                full
              >
                <div className="flex flex-wrap gap-3 pt-1">
                  {ACCOUNT_TYPES.map((t) => (
                    <label key={t} className="flex items-center gap-1.5 text-sm text-primary">
                      <input
                        type="checkbox"
                        checked={form.allowedAccountTypes.includes(t)}
                        onChange={() => toggleType(t)}
                        className="h-4 w-4 rounded border-default"
                      />
                      {ACCOUNT_TYPE_LABELS[t]}
                    </label>
                  ))}
                </div>
              </Field>
            </div>

            {formError && <p className="text-sm text-rose-400">{formError}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeForm}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={pending}>
                {isEditing ? "Save Changes" : "Add Medium"}
              </Button>
            </div>
          </form>
        )}

        {mediums.length === 0 ? (
          <EmptyState icon={<InboxIcon className="h-6 w-6" />} title="No mediums yet" description="Add your first one above." />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {mediums.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-default bg-surface-2 px-3 py-2.5"
              >
                <span className="text-sm font-medium text-primary">{m.name}</span>
                <Badge tone="neutral">
                  {m.allowedAccountTypes.length === 0
                    ? "Any account type"
                    : m.allowedAccountTypes.map((t) => ACCOUNT_TYPE_LABELS[t]).join(", ")}
                </Badge>
                {m.defaultAccountName && <Badge tone="accent">Default: {m.defaultAccountName}</Badge>}
                <div className="ml-auto flex gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEditForm(m)} aria-label="Edit">
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(m)} aria-label="Delete">
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
