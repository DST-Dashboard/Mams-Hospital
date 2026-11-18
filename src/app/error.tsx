"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Audit failure
    console.error("Global boundary caught error:", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-page)]">
      <div
        role="alert"
        className="card max-w-lg w-full p-8 text-center flex flex-col items-center shadow-[var(--sh-shell)]"
      >
        <div className="empty-bubble bg-[var(--err-bg)] text-[var(--err-tx)]">
          <AlertTriangle size={28} aria-hidden />
        </div>

        <h1 className="font-display font-bold text-[24px] text-[var(--tx-head)] m-0 mb-3">
          Something went wrong
        </h1>

        <p className="text-[14px] text-[var(--tx-muted)] leading-[1.6] m-0 mb-6 max-w-md">
          The application encountered an unexpected error. Sensor data in the hospital database
          remains completely intact and safe.
        </p>

        {error?.message && (
          <div className="code-card text-[12px] p-3 mb-6 w-full text-left overflow-x-auto">
            {error.message}
          </div>
        )}

        <Button
          variant="primary"
          onClick={reset}
          icon={RefreshCw}
          className="h-10 px-6"
        >
          Try again
        </Button>
      </div>
    </main>
  );
}
