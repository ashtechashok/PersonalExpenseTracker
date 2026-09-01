"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAccountRole, renameAccountRole, deleteAccountRole } from "./account-roles-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XIcon, InboxIcon } from "@/components/ui/icons";

export type ClientAccountRole = { id: string; name: string };

export default function AccountRolesSection({ roles }: { roles: ClientAccountRole[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const result = await createAccountRole({ name });
    setAdding(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setNewName("");
    toast.success("Role added");
    router.refresh();
  }

  function startEdit(r: ClientAccountRole) {
    setEditingId(r.id);
    setEditingName(r.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveEdit(id: string) {
    const name = editingName.trim();
    if (!name) return;
    setSavingId(id);
    const result = await renameAccountRole(id, name);
    setSavingId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Role renamed");
    cancelEdit();
    router.refresh();
  }

  async function handleDelete(r: ClientAccountRole) {
    const ok = await confirm({ title: `Delete "${r.name}"?`, confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    const result = await deleteAccountRole(r.id);
    if (result.error) toast.error(result.error);
    else toast.success("Role deleted");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-secondary">
        Your own account roles (e.g. &ldquo;Emergency Fund&rdquo;, &ldquo;Salary Account&rdquo;) — add, rename, or remove them. Every role
        automatically gets its own summary total on the Dashboard. Deleting one only removes it from the picker;
        accounts that already carry it keep showing it unchanged.
      </p>

      <Card className="max-w-xl p-4 sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-primary">Account Roles</h2>

        <form onSubmit={handleAdd} className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="e.g. Retirement Fund"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={inputClass}
            maxLength={50}
          />
          <Button type="submit" variant="secondary" loading={adding} disabled={!newName.trim()}>
            <PlusIcon className="h-4 w-4" />
            Add
          </Button>
        </form>

        {roles.length === 0 ? (
          <EmptyState icon={<InboxIcon className="h-6 w-6" />} title="No roles yet" description="Add your first one above." />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {roles.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-lg border border-default bg-surface-2 px-3 py-2">
                {editingId === r.id ? (
                  <>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className={`${inputClass} py-1.5`}
                      maxLength={50}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(r.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => saveEdit(r.id)}
                      loading={savingId === r.id}
                      disabled={!editingName.trim()}
                      aria-label="Save"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} aria-label="Cancel">
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate text-sm text-primary">{r.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(r)} aria-label="Rename">
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(r)} aria-label="Delete">
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
