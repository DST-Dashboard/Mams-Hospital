import Link from "next/link";
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="max-w-md"><h1 className="text-2xl font-semibold">Page not found</h1><p className="mt-2 text-muted">That address doesn’t exist, or the tank was removed.</p><Link href="/dashboard" className="btn-primary mt-6">Back to dashboard</Link></div>
    </main>
  );
}
