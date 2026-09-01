"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCategory, renameCategory, deleteCategory } from "./categories-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XIcon, InboxIcon } from "@/components/ui/icons";

export type ClientCategory = { id: string; name: string; type: "EXPENSE" | "INCOME" };

function CategoryList({
  title,
  type,
  categories,
}: {
  title: string;
  type: "EXPENSE" | "INCOME";
  categories: ClientCategory[];
}) {
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
    const result = await createCategory({ name, type });
    setAdding(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setNewName("");
    toast.success("Category added");
    router.refresh();
  }

  function startEdit(c: ClientCategory) {
    setEditingId(c.id);
    setEditingName(c.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveEdit(id: string) {
    const name = editingName.trim();
    if (!name) return;
    setSavingId(id);
    const result = await renameCategory(id, name);
    setSavingId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Category renamed");
    cancelEdit();
    router.refresh();
  }

  async function handleDelete(c: ClientCategory) {
    const ok = await confirm({
      title: `Delete "${c.name}"?`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const result = await deleteCategory(c.id);
    if (result.error) toast.error(result.error);
    else toast.success("Category deleted");
    router.refresh();
  }

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-primary">{title}</h2>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="e.g. Groceries"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className={inputClass}
          maxLength={100}
        />
        <Button type="submit" variant="secondary" loading={adding} disabled={!newName.trim()}>
          <PlusIcon className="h-4 w-4" />
          Add
        </Button>
      </form>

      {categories.length === 0 ? (
        <EmptyState icon={<InboxIcon className="h-6 w-6" />} title="No categories yet" description="Add your first one above." />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-default bg-surface-2 px-3 py-2"
            >
              {editingId === c.id ? (
                <>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className={`${inputClass} py-1.5`}
                    maxLength={100}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(c.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => saveEdit(c.id)}
                    loading={savingId === c.id}
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
                  <span className="flex-1 truncate text-sm text-primary">{c.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(c)} aria-label="Rename">
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(c)} aria-label="Delete">
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function CategoriesSection({ categories }: { categories: ClientCategory[] }) {
  const expense = categories.filter((c) => c.type === "EXPENSE");
  const income = categories.filter((c) => c.type === "INCOME");

  return (
    <div className="space-y-4">
      <p className="text-sm text-secondary">
        Your own spending and income categories — add, rename, or remove them. Deleting one only removes it from the
        picker for new entries; it never changes anything you&rsquo;ve already logged.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <CategoryList title="Expense Categories" type="EXPENSE" categories={expense} />
        <CategoryList title="Income Categories" type="INCOME" categories={income} />
      </div>
    </div>
  );
}
