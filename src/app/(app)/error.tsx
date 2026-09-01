"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertCircleIcon } from "@/components/ui/icons";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-sm animate-scale-in p-6 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
          <AlertCircleIcon className="h-5 w-5" />
        </div>
        <h2 className="mt-3 text-sm font-semibold text-primary">Something went wrong</h2>
        <p className="mt-1 text-sm text-secondary">An unexpected error occurred while loading this page.</p>
        <Button variant="primary" className="mt-5 w-full" onClick={reset}>
          Try again
        </Button>
      </Card>
    </div>
  );
}
