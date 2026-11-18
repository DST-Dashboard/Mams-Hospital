/**
 * Clock provider. In production OHTMS runs on live wall-clock time.
 * In unit and integration tests, an injectable clock can be set.
 */
let testClock: (() => number) | undefined;

export function setClock(fn?: () => number): void {
  testClock = fn;
}

export function now(): number {
  return testClock ? testClock() : Date.now();
}

export function clockMode(): "live" | "anchored" {
  return "live";
}
