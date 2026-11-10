"use client";

import clsx from "clsx";
import React, { createContext, useContext, useId, useState, type ReactNode } from "react";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const baseId = useId();

  const activeTab = value !== undefined ? value : internalValue;
  const setActiveTab = (newVal: string) => {
    if (value === undefined) setInternalValue(newVal);
    onValueChange?.(newVal);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, baseId }}>
      <div className={clsx("w-full space-y-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({
  children,
  className,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={clsx(
        "inline-flex items-center gap-1 border-b hairline pb-px overflow-x-auto w-full",
        className
      )}
    >
      {children}
    </div>
  );
}

export interface TabTriggerProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  badge?: ReactNode;
}

export function TabTrigger({ value, children, disabled, className, badge }: TabTriggerProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabTrigger must be used inside Tabs");

  const isSelected = ctx.activeTab === value;
  const tabId = `${ctx.baseId}-tab-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;

  return (
    <button
      role="tab"
      id={tabId}
      aria-selected={isSelected}
      aria-controls={panelId}
      disabled={disabled}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => ctx.setActiveTab(value)}
      className={clsx(
        "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-all whitespace-nowrap",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tide focus-visible:rounded",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        isSelected
          ? "border-tide text-tide font-semibold"
          : "border-transparent text-muted hover:text-ink hover:border-line",
        className
      )}
    >
      <span>{children}</span>
      {badge ? <span>{badge}</span> : null}
    </button>
  );
}

export function TabPanel({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabPanel must be used inside Tabs");

  const isSelected = ctx.activeTab === value;
  const tabId = `${ctx.baseId}-tab-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;

  if (!isSelected) return null;

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      tabIndex={0}
      className={clsx("focus-visible:outline-none animate-in fade-in-50 duration-150", className)}
    >
      {children}
    </div>
  );
}
