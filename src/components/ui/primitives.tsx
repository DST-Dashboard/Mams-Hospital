import clsx from "clsx";
import type { ReactNode } from "react";

export function PageHeader({ title, children, sub }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>{sub && <p className="mt-1 max-w-prose text-sm text-muted">{sub}</p>}</div>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}
export const Skeleton = ({ className }: { className?: string }) => <div className={clsx("animate-pulse rounded bg-raised", className)} aria-hidden />;
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded border hairline bg-surface p-6">
      <p className="font-medium">We couldn’t load this.</p><p className="mt-1 text-sm text-muted">{message}</p>
      {onRetry && <button className="btn-quiet mt-4" onClick={onRetry}>Try again</button>}
    </div>
  );
}
export function Planned({ title, phase, items }: { title: string; phase: string; items: string[] }) {
  return (
    <section className="rounded border border-dashed hairline p-6">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted">Scaffolded route — build in {phase}. Feature IDs refer to docs/FEATURES.md.</p>
      <ul className="mt-4 grid gap-1 text-sm sm:grid-cols-2">{items.map((i) => <li key={i} className="text-muted">{i}</li>)}</ul>
    </section>
  );
}
