"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckIcon, AlertCircleIcon } from "./icons";

type ToastTone = "success" | "error";
type ToastItem = { id: number; message: string; tone: ToastTone };
type ToastFns = { success: (message: string) => void; error: (message: string) => void };

const ToastContext = createContext<ToastFns | null>(null);

export function useToast(): ToastFns {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: ToastTone) => {
    const id = nextId++;
    setItems((cur) => [...cur, { id, message, tone }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 4000);
  }, []);

  const value: ToastFns = {
    success: useCallback((m: string) => push(m, "success"), [push]),
    error: useCallback((m: string) => push(m, "error"), [push]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:items-end">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-elevated animate-slide-up ${
              t.tone === "success" ? "border-emerald-500/20 bg-surface-2" : "border-rose-500/20 bg-surface-2"
            }`}
          >
            {t.tone === "success" ? (
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            ) : (
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
            )}
            <span className="text-primary">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
