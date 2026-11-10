"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronRight, HelpCircle, Info } from "lucide-react";

export { EmptyState, ErrorState, Banner, Skeleton } from "./EmptyState";

/* =========================================================================
   Card
   ========================================================================= */
export interface CardProps {
  eyebrow?: {
    icon: LucideIcon;
    text: string;
  };
  title?: string;
  titleAs?: "h2" | "h3";
  pill?: React.ReactNode;
  actions?: React.ReactNode;
  footnote?: React.ReactNode;
  accent?: boolean;
  gradient?: boolean;
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export function Card({
  eyebrow,
  title,
  titleAs: TitleTag = "h2",
  pill,
  actions,
  footnote,
  accent = false,
  gradient = false,
  id,
  className,
  children,
}: CardProps) {
  const hasHead = eyebrow || title || pill || actions;

  return (
    <section
      id={id}
      className={clsx(
        "card",
        accent && "card--accent",
        gradient && "card--gradient",
        className
      )}
    >
      {hasHead && (
        <div className="card-head">
          <div>
            {eyebrow && (
              <div className="eyebrow">
                <eyebrow.icon size={12} aria-hidden />
                <span>{eyebrow.text}</span>
              </div>
            )}
            {title && <TitleTag className="card-title">{title}</TitleTag>}
          </div>

          <div className="flex items-center gap-3">
            {pill && <div className="card-pill">{pill}</div>}
            {actions && <div className="card-actions">{actions}</div>}
          </div>
        </div>
      )}

      <div className="card-body">{children}</div>

      {footnote && (
        <div className="card-foot">
          <Info size={14} aria-hidden />
          <span>{footnote}</span>
        </div>
      )}
    </section>
  );
}

/* =========================================================================
   KPI Row & KPI Box
   ========================================================================= */
export function KpiRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={clsx("kpi-row", className)}>{children}</div>;
}

export interface KpiBoxProps {
  icon: LucideIcon;
  value: React.ReactNode;
  caption: string;
  definition?: string;
  tone?: "default" | "ok" | "warn" | "err";
  className?: string;
}

export function KpiBox({
  icon: Icon,
  value,
  caption,
  definition,
  tone = "default",
  className,
}: KpiBoxProps) {
  return (
    <div
      className={clsx(
        "kpi",
        tone === "ok" && "border-[var(--ok-bd)]",
        tone === "warn" && "border-[var(--warn-bd)]",
        tone === "err" && "border-[var(--err-bd)]",
        className
      )}
    >
      <div
        className={clsx(
          "kpi-icon",
          tone === "ok" && "bg-[var(--ok-bg)] text-[var(--ok-tx)]",
          tone === "warn" && "bg-[var(--warn-bg)] text-[var(--warn-tx)]",
          tone === "err" && "bg-[var(--err-bg)] text-[var(--err-tx)]"
        )}
      >
        <Icon size={24} aria-hidden />
      </div>

      <div className="flex-1 min-w-0">
        <div
          className={clsx(
            "kpi-value",
            tone === "ok" && "text-[var(--ok-tx)]",
            tone === "warn" && "text-[var(--warn-tx)]",
            tone === "err" && "text-[var(--err-tx)]"
          )}
        >
          {value}
        </div>
        <div className="kpi-caption">{caption}</div>
      </div>

      {definition && <div className="kpi-def">{definition}</div>}
    </div>
  );
}

/* =========================================================================
   PageHeader
   ========================================================================= */
export interface PageHeaderProps {
  eyebrow?: {
    icon: LucideIcon;
    text: string;
  };
  title: string;
  intro?: string;
  as?: "h1" | "h2";
  modeBadge?: React.ReactNode;
  actions?: React.ReactNode;
  modeLine?: React.ReactNode;
  // Backwards compatibility with initial shell views
  sub?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  intro,
  as: TitleTag = "h1",
  modeBadge,
  actions,
  modeLine,
  sub,
  children,
  className,
}: PageHeaderProps) {
  const introText = intro || (typeof sub === "string" ? sub : undefined);

  return (
    <header className={clsx("page-header", className)}>
      <div className="flex-1 min-w-0">
        {eyebrow && (
          <div className="eyebrow">
            <eyebrow.icon size={13} aria-hidden />
            <span>{eyebrow.text}</span>
          </div>
        )}
        <TitleTag className="page-title">{title}</TitleTag>
        {introText && <p className="page-intro">{introText}</p>}
        {sub && typeof sub !== "string" && <div className="mt-1">{sub}</div>}
        {modeLine && <div className="mode-line">{modeLine}</div>}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {modeBadge}
        {actions}
        {children}
      </div>
    </header>
  );
}

/* =========================================================================
   ControlPanel & primitives
   ========================================================================= */
export function ControlPanel({
  children,
  actions,
  className,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("control-panel", className)}>
      <div className="flex items-end flex-wrap gap-4 flex-1">{children}</div>
      {actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
    </div>
  );
}

export function ControlGroup({
  label,
  icon: Icon,
  htmlFor,
  children,
  className,
}: {
  label: string;
  icon?: LucideIcon;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("control-group", className)}>
      <label htmlFor={htmlFor} className="control-label">
        <span>{label}</span>
        {Icon && <Icon size={12} className="text-[var(--accent-500)]" aria-hidden />}
      </label>
      {children}
    </div>
  );
}

export function FieldHelp({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={clsx("field-help", className)}>{children}</div>;
}

export function ContextBar({
  text,
  status,
  className,
}: {
  text: string;
  status?: {
    state: "loading" | "live" | "error" | "snapshot";
    text: string;
  };
  className?: string;
}) {
  return (
    <div className={clsx("context-bar", className)}>
      <div>{text}</div>
      {status && (
        <div
          role="status"
          aria-live="polite"
          className="context-status font-medium flex items-center gap-1.5"
        >
          <span
            className={clsx(
              "w-2 h-2 rounded-full",
              status.state === "live" && "bg-[var(--live)] animate-pulse",
              status.state === "snapshot" && "bg-[var(--gold-500)]",
              status.state === "loading" && "bg-[var(--brand-500)] animate-ping",
              status.state === "error" && "bg-[var(--err-tx)]"
            )}
            aria-hidden
          />
          <span>{status.text}</span>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Segmented & Switch
   ========================================================================= */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
  title?: string;
}

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (val: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
  size?: "md" | "sm";
  className?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = "md",
  className,
}: SegmentedProps<T>) {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (index + 1) % options.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (index - 1 + options.length) % options.length;
    }
    if (nextIndex !== -1) {
      e.preventDefault();
      const target = options[nextIndex];
      if (target && !target.disabled) {
        onChange(target.value);
      }
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={clsx("segmented", className)}
    >
      {options.map((opt, idx) => {
        const isSelected = opt.value === value;
        const Icon = opt.icon;

        return (
          <button
            key={opt.value}
            role="radio"
            type="button"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            disabled={opt.disabled}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={clsx(
              "segmented-item",
              isSelected && "active",
              size === "sm" && "py-1 px-2 text-[11px]"
            )}
          >
            {Icon && <Icon size={size === "sm" ? 11 : 13} aria-hidden />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={clsx(
        "switch",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div>
        <span className="text-[14px] font-medium text-[var(--tx-head)]">{label}</span>
        {hint && <span className="block text-[12px] text-[var(--tx-quiet)]">{hint}</span>}
      </div>
    </label>
  );
}

/* =========================================================================
   Explanatory components
   ========================================================================= */
export function ViewGuide({
  question,
  description,
  steps,
  howToRead,
  collapsedByDefault = false,
  storageKey,
}: {
  question: string;
  description: string;
  steps: [string, string, string];
  howToRead: string;
  collapsedByDefault?: boolean;
  storageKey?: string;
}) {
  const [open, setOpen] = useState(!collapsedByDefault);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(`ohtms:guide:${storageKey}`);
      if (saved !== null) setOpen(saved === "true");
    } catch {}
  }, [storageKey]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (storageKey && typeof window !== "undefined") {
      try {
        localStorage.setItem(`ohtms:guide:${storageKey}`, String(next));
      } catch {}
    }
  };

  return (
    <div className="view-guide">
      <div
        onClick={toggle}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="text-[var(--brand-600)]" aria-hidden />
          <h2 className="text-[17px] font-semibold text-[var(--tx-guide)] m-0 font-display">
            {question}
          </h2>
        </div>
        <ChevronDown
          size={18}
          className={clsx(
            "text-[var(--brand-600)] transition-transform duration-200",
            open ? "rotate-180" : ""
          )}
          aria-hidden
        />
      </div>

      {open && (
        <div className="mt-4 pt-3 border-t border-[var(--bd-step)]">
          <p className="text-[13px] text-[var(--tx-body)] leading-[1.8] mb-3">
            {description}
          </p>

          <div className="guide-steps">
            {steps.map((step, idx) => (
              <div key={idx} className="guide-step">
                <span className="w-5 h-5 rounded-full bg-[var(--brand-600)] text-white inline-flex items-center justify-center text-[11px] font-bold mr-2">
                  {idx + 1}
                </span>
                <span className="text-[12.8px] text-[var(--tx-step)] font-medium leading-[1.6]">
                  {step}
                </span>
              </div>
            ))}
          </div>

          <div className="text-[12px] text-[var(--tx-note)] mt-3 bg-white/60 p-3 rounded-[6px]">
            <strong>How to read:</strong> {howToRead}
          </div>
        </div>
      )}
    </div>
  );
}

export function ChartExplainer({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="explainer">
      <div className="font-semibold text-[var(--tx-main)] mb-1 flex items-center gap-1.5">
        <Info size={14} className="text-[var(--data-600)]" aria-hidden />
        <span>{question}</span>
      </div>
      <div>{children}</div>
    </aside>
  );
}

export function Glossary({
  terms,
}: {
  terms: { term: string; def: string }[];
}) {
  return (
    <details className="glossary">
      <summary className="font-semibold text-[14px] text-[var(--brand-600)] cursor-pointer select-none">
        Domain Glossary & Terminology ({terms.length} terms)
      </summary>
      <dl className="grid grid-cols-[130px_1fr] gap-3 text-[12px] leading-[1.8] mt-4 pt-3 border-t border-[var(--bd-gloss)]">
        {terms.map((t) => (
          <React.Fragment key={t.term}>
            <dt className="font-bold text-[var(--tx-link)]">{t.term}</dt>
            <dd className="text-[var(--tx-body)] m-0">{t.def}</dd>
          </React.Fragment>
        ))}
      </dl>
    </details>
  );
}

/* =========================================================================
   Breadcrumbs & ProgressBar & Dropdown
   ========================================================================= */
export function Breadcrumbs({
  items,
  className,
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumbs" className={clsx("flex items-center gap-2 text-[12px] text-[var(--tx-soft)]", className)}>
      {items.map((item, idx) => (
        <React.Fragment key={item.label}>
          {idx > 0 && <ChevronRight size={12} aria-hidden />}
          {item.href ? (
            <Link href={item.href} className="hover:text-[var(--tx-head)] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="font-bold text-[var(--tx-head)]" aria-current="page">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function ProgressBar({
  value,
  label,
  tone = "brand",
  className,
}: {
  value: number | null;
  label?: string;
  tone?: "brand" | "ok" | "warn" | "err";
  className?: string;
}) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));

  return (
    <div className={clsx("w-full", className)}>
      {label && (
        <div className="flex justify-between text-[11px] font-medium text-[var(--tx-label)] mb-1">
          <span>{label}</span>
          <span>{value == null ? "—" : `${Math.round(pct)}%`}</span>
        </div>
      )}
      <div className="h-2 rounded-[4px] bg-[var(--bd-soft)] overflow-hidden">
        <div
          className={clsx(
            "h-full transition-all duration-500",
            tone === "brand" && "bg-[var(--brand-600)]",
            tone === "ok" && "bg-[var(--ok-tx)]",
            tone === "warn" && "bg-[var(--warn-tx)]",
            tone === "err" && "bg-[var(--err-tx)]"
          )}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value == null ? undefined : pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

export function Dropdown({
  trigger,
  children,
  align = "left",
  className,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className={clsx("relative inline-block", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="cursor-pointer inline-flex items-center"
      >
        {trigger}
      </div>

      {open && (
        <div
          className={clsx(
            "absolute top-full mt-1 min-w-[260px] bg-[var(--bg-card)] rounded-[12px] p-2 border border-[var(--bd)] shadow-[var(--sh-shell)] z-[var(--z-dropdown)] animate-in fade-in slide-in-from-top-2 duration-200 border-t-[3px] border-t-[var(--accent-500)]",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function Planned({
  title,
  phase,
  items,
}: {
  title: string;
  phase: string;
  items: string[];
}) {
  return (
    <section className="card border-dashed">
      <h2 className="card-title text-[18px]">{title}</h2>
      <p className="text-[13px] text-[var(--tx-muted)] mt-1">
        Scaffolded route — build in {phase}. Feature IDs refer to docs/FEATURES.md.
      </p>
      <ul className="mt-4 grid gap-1.5 text-[13px] sm:grid-cols-2">
        {items.map((i) => (
          <li key={i} className="text-[var(--tx-muted)]">
            {i}
          </li>
        ))}
      </ul>
    </section>
  );
}
