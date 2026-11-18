"use client";

import React from "react";
import Link from "next/link";
import clsx from "clsx";
import { Check, Lock } from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  href: string;
}

export interface SecondaryTabsProps {
  tabs: TabItem[];
  activeId: string;
  className?: string;
}

export function SecondaryTabs({ tabs, activeId, className }: SecondaryTabsProps) {
  return (
    <nav
      aria-label="Secondary tabs"
      className={clsx(
        "flex items-center gap-6 border-b border-[var(--bd)] mb-6 overflow-x-auto",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={clsx(
              "text-[15.2px] font-semibold pb-3 pt-1 border-b-[3px] transition-colors whitespace-nowrap",
              isActive
                ? "border-[var(--accent-500)] text-[var(--tx-head)]"
                : "border-transparent text-[var(--tx-tab)] hover:text-[var(--tx-head)] hover:border-[var(--bd-strong)]"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export interface StepItem {
  label: string;
  state: "done" | "current" | "todo" | "locked";
  meta?: string;
}

export interface StepperProps {
  steps: StepItem[];
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Stepper({
  steps,
  orientation = "horizontal",
  className,
}: StepperProps) {
  const isVert = orientation === "vertical";

  return (
    <div
      role="list"
      aria-label="Process stepper"
      className={clsx(
        "flex",
        isVert ? "flex-col gap-4" : "flex-row items-center gap-3 w-full overflow-x-auto",
        className
      )}
    >
      {steps.map((step, idx) => {
        const isCurrent = step.state === "current";
        const isDone = step.state === "done";
        const isLocked = step.state === "locked";

        return (
          <div
            key={step.label}
            role="listitem"
            className={clsx(
              "flex items-center gap-3",
              !isVert && "flex-1 min-w-[140px]"
            )}
          >
            <div
              className={clsx(
                "w-[23px] h-[23px] rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors",
                isDone && "bg-[var(--brand-600)] text-white",
                isCurrent && "bg-[var(--accent-500)] text-white shadow-sm ring-2 ring-[var(--accent-500)] ring-offset-1",
                step.state === "todo" && "bg-[var(--bd-strong)] text-[var(--tx-main)]",
                isLocked && "bg-[var(--neutral-bg)] text-[var(--neutral-tx)] border border-[var(--neutral-bd)]"
              )}
              aria-label={`Step ${idx + 1}: ${step.label} (${step.state})`}
            >
              {isDone ? (
                <Check size={13} aria-hidden strokeWidth={3} />
              ) : isLocked ? (
                <Lock size={11} aria-hidden />
              ) : (
                idx + 1
              )}
            </div>

            <div className="min-w-0">
              <p
                className={clsx(
                  "text-[13px] font-semibold m-0 leading-[1.3] truncate",
                  isCurrent ? "text-[var(--tx-head)]" : "text-[var(--tx-body)]"
                )}
              >
                {step.label}
              </p>
              {step.meta && (
                <p className="text-[11px] text-[var(--tx-quiet)] m-0 leading-[1.4] truncate">
                  {step.meta}
                </p>
              )}
            </div>

            {!isVert && idx < steps.length - 1 && (
              <div
                className={clsx(
                  "h-[2px] flex-1 mx-2 transition-colors",
                  isDone ? "bg-[var(--brand-600)]" : "bg-[var(--bd)]"
                )}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
