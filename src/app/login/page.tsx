import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in · MAMS Hospital",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-5 bg-[var(--g-ocean)] relative overflow-hidden select-none">
      {/* Decorative concentric ripples */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full border border-white/10 pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full border border-white/10 pointer-events-none"
        aria-hidden
      />

      <div className="w-full max-w-md relative z-10">
        <div className="card p-8 sm:p-10 shadow-[var(--sh-shell)] border border-[var(--bd-soft)]">
          {/* Header branding */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="mb-4">
              <Image
                src="/assets/mams-logo.png"
                alt="MAMS Hospital"
                width={64}
                height={64}
                priority
                className="rounded-2xl object-contain"
              />
            </div>
            <h1 className="font-display font-black text-[24px] text-[var(--tx-head)] m-0">
              MAMS Hospital
            </h1>
            <p className="text-[14px] text-[var(--tx-muted)] mt-1.5 m-0">
              Sign in to monitor rooftop water tanks in real time
            </p>
          </div>

          <Suspense fallback={<div className="h-48 skeleton" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
