"use client";

import { useEffect, useState } from "react";

/**
 * Checks whether the user has requested reduced motion.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);

    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  return prefersReduced;
}

/**
 * Traps focus inside a container element, returning focus to the previous active element upon unmount.
 */
export function trapFocus(container: HTMLElement | null): () => void {
  if (!container || typeof document === "undefined") return () => {};

  const previousActive = document.activeElement as HTMLElement | null;

  const focusableSelector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const getFocusable = () =>
    Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (el) => el.offsetParent !== null
    );

  const focusables = getFocusable();
  // Only shift focus if the current active element is outside the container
  if (!container.contains(document.activeElement)) {
    // Prefer focusing an input, textarea or autofocus element before the close button
    const preferred =
      focusables.find(
        (el) => el.hasAttribute("autofocus") || el.tagName === "INPUT" || el.tagName === "TEXTAREA"
      ) || focusables[0];

    if (preferred) {
      preferred.focus();
    } else {
      container.focus();
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    const currentFocusables = getFocusable();
    if (currentFocusables.length === 0) {
      e.preventDefault();
      return;
    }

    const first = currentFocusables[0];
    const last = currentFocusables[currentFocusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first || document.activeElement === container) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };

  container.addEventListener("keydown", handleKeyDown);

  return () => {
    container.removeEventListener("keydown", handleKeyDown);
    if (previousActive && typeof previousActive.focus === "function") {
      previousActive.focus();
    }
  };
}

/**
 * Programmatically announces a message to screen readers via an accessible live region.
 */
export function announce(message: string, politeness: "polite" | "assertive" = "polite") {
  if (typeof document === "undefined") return;

  const id = `ohtms-live-announcer-${politeness}`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.setAttribute("role", politeness === "assertive" ? "alert" : "status");
    el.setAttribute("aria-live", politeness);
    el.setAttribute("aria-atomic", "true");
    el.className = "sr-only";
    document.body.appendChild(el);
  }

  el.textContent = "";
  // Trigger DOM mutation
  setTimeout(() => {
    if (el) el.textContent = message;
  }, 50);
}
