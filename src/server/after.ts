import { after } from "next/server";

/**
 * Executes a background task using Next.js `after()`.
 * If invoked outside a Next.js request context (e.g. during test execution),
 * safely runs the task asynchronously without throwing.
 */
export function safeAfter(fn: () => void | Promise<void>): void {
  try {
    after(fn);
  } catch {
    void Promise.resolve().then(fn).catch(() => {});
  }
}
