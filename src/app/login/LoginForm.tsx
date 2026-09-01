"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { AlertCircleIcon } from "@/components/ui/icons";

const initialState: LoginState = {};

export default function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form
      action={formAction}
      className="w-full max-w-sm animate-slide-up space-y-5 rounded-2xl border border-subtle bg-surface p-7 shadow-elevated"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 text-lg font-bold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset]">
          E
        </div>
        <div>
          <h1 className="text-lg font-semibold text-primary">Expense Tracker</h1>
          <p className="mt-1 text-sm text-secondary">Sign in to continue</p>
        </div>
      </div>

      <input type="hidden" name="next" value={next ?? "/dashboard"} />

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-medium tracking-wide text-secondary">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-medium tracking-wide text-secondary">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>

      {state.error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          <AlertCircleIcon className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      <Button type="submit" variant="primary" loading={pending} className="w-full">
        {pending ? "Signing in…" : "Sign In"}
      </Button>

      <p className="text-center text-sm text-secondary">
        New here?{" "}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
