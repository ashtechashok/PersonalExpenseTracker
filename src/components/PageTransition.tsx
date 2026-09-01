"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Remounting on pathname change replays the CSS entrance animation — a
 * simple, dependency-free page transition. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-slide-up">
      {children}
    </div>
  );
}
