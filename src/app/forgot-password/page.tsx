import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { ForgotForm } from "@/features/auth/ForgotForm";

export const metadata: Metadata = {
  title: "Forgot Password · MAMS Hospital",
};

export default function ForgotPasswordPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "var(--g-ocean)",
        position: "relative",
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px", position: "relative", zIndex: 10 }}>
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--r-2xl)",
            padding: "36px 32px",
            boxShadow: "var(--sh-shell)",
            border: "1px solid var(--bd-soft)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "var(--sp-6)" }}>
            <Image
              src="/assets/mams-logo.png"
              alt="MAMS Hospital"
              width={56}
              height={56}
              priority
              className="rounded-xl object-contain"
            />
            <h1 style={{ fontSize: "22px", fontWeight: 900, fontFamily: "var(--f-display)", color: "var(--tx-head)", marginTop: "var(--sp-3)", marginBottom: "4px" }}>
              Reset Access Password
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--tx-muted)" }}>
              Enter your hospital email to receive reset instructions
            </p>
          </div>

          <Suspense fallback={<div className="skeleton" style={{ height: "160px" }} />}>
            <ForgotForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
