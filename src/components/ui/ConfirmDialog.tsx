"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AlertCircleIcon } from "./icons";
import { Button } from "./Button";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "default" | "danger";
};

type PendingConfirm = ConfirmOptions & { resolve: (value: boolean) => void };

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => setPending({ ...options, resolve }));
  }, []);

  const settle = useCallback(
    (result: boolean) => {
      pending?.resolve(result);
      setPending(null);
    },
    [pending]
  );

  useEffect(() => {
    if (!pending) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") settle(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pending, settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => settle(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-default bg-surface-2 p-5 shadow-elevated animate-scale-in"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  pending.tone === "danger" ? "bg-rose-500/10 text-rose-300" : "bg-indigo-500/10 text-indigo-300"
                }`}
              >
                <AlertCircleIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 pt-1">
                <h2 id="confirm-dialog-title" className="text-sm font-semibold text-primary">
                  {pending.title}
                </h2>
                {pending.description && <p className="mt-1.5 text-sm text-secondary">{pending.description}</p>}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => settle(false)}>
                Cancel
              </Button>
              <Button variant={pending.tone === "danger" ? "danger" : "primary"} size="sm" onClick={() => settle(true)}>
                {pending.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
