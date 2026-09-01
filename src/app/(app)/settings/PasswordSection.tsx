"use client";

import { useState } from "react";
import { changePassword } from "./password-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { SettingsIcon } from "@/components/ui/icons";

const emptyForm = { currentPassword: "", newPassword: "", confirmNewPassword: "" };

export default function PasswordSection() {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await changePassword(form);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Password changed");
    setForm(emptyForm);
  }

  return (
    <Card className="max-w-xl p-5">
      <div className="flex items-center gap-2 pb-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--tint-rgb)/0.08)] text-accent">
          <SettingsIcon className="h-[18px] w-[18px]" />
        </span>
        <h2 className="text-sm font-medium text-primary">Password</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Current password">
          <input
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
            className={inputClass}
            required
          />
        </Field>

        <Field label="New password" hint="At least 8 characters.">
          <input
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
            className={inputClass}
            required
            minLength={8}
          />
        </Field>

        <Field label="Confirm new password">
          <input
            type="password"
            autoComplete="new-password"
            value={form.confirmNewPassword}
            onChange={(e) => setForm((f) => ({ ...f, confirmNewPassword: e.target.value }))}
            className={inputClass}
            required
            minLength={8}
          />
        </Field>

        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary" loading={saving}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}
