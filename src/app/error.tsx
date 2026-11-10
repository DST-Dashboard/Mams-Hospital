"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div role="alert" className="max-w-md">
        <h1 className="text-2xl font-semibold">Something went wrong.</h1>
        <p className="mt-2 text-muted">The page failed to load. Your data is safe. Try again, and if it keeps happening tell the administrator.</p>
        <button className="btn-primary mt-6" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
