"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSettings } from "./actions";
import { CURRENCY_OPTIONS, LOCALE_OPTIONS, TIMEZONE_OPTIONS } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { SettingsIcon } from "@/components/ui/icons";

export default function LocaleSection({
  currency,
  locale,
  timezone,
}: {
  currency: string;
  locale: string;
  timezone: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ currency, locale, timezone });
  const [saving, setSaving] = useState(false);

  const dirty = form.currency !== currency || form.locale !== locale || form.timezone !== timezone;

  async function save() {
    setSaving(true);
    const result = await updateSettings(form);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved");
    router.refresh();
  }

  return (
    <Card className="max-w-xl p-5">
      <div className="flex items-center gap-2 pb-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--tint-rgb)/0.08)] text-accent">
          <SettingsIcon className="h-[18px] w-[18px]" />
        </span>
        <h2 className="text-sm font-medium text-primary">Locale</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Currency" hint="Used for every amount shown across the app.">
          <Select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Date & number format" hint="Controls day/month order and number grouping.">
          <Select value={form.locale} onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))}>
            {LOCALE_OPTIONS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Timezone" hint="Used to decide 'today' for recurring items, EMIs, and monthly totals." full>
          <Select value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}>
            {TIMEZONE_OPTIONS.map((t) => (
              <option key={t.tz} value={t.tz}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex justify-end pt-5">
        <Button variant="primary" onClick={save} loading={saving} disabled={!dirty}>
          Save changes
        </Button>
      </div>
    </Card>
  );
}
