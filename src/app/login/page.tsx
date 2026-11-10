import { Suspense } from "react";
import { Droplets } from "lucide-react";
import { LoginForm } from "@/features/auth/LoginForm";
export const metadata = { title: "Sign in" };
export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm">
        <Droplets className="mb-4 text-tide" size={32} aria-hidden />
        <h1 className="mb-1 text-3xl font-semibold tracking-tight">MAMS Water</h1>
        <p className="mb-8 text-muted">Sign in to see every overhead tank at once.</p>
        <Suspense><LoginForm /></Suspense>
      </div>
    </main>
  );
}
