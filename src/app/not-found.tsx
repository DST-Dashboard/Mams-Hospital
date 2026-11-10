"use client";

import { HelpCircle, Home } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-page)]">
      <div className="card max-w-lg w-full p-8 text-center flex flex-col items-center shadow-[var(--sh-shell)]">
        <div className="empty-bubble bg-[var(--bg-pill)] text-[var(--brand-600)]">
          <HelpCircle size={28} aria-hidden />
        </div>

        <h1 className="font-display font-bold text-[24px] text-[var(--tx-head)] m-0 mb-3">
          Page not found (404)
        </h1>

        <p className="text-[14px] text-[var(--tx-muted)] leading-[1.6] m-0 mb-6 max-w-md">
          The requested address does not exist, or the tank or record has been decommissioned.
        </p>

        <LinkButton
          href="/dashboard"
          variant="primary"
          icon={Home}
          className="h-10 px-6"
        >
          Return to Dashboard
        </LinkButton>
      </div>
    </main>
  );
}
