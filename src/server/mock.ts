import { NextResponse } from "next/server";

/**
 * Backend owner: this is how an unfinished endpoint behaves.
 *  ENABLE_MOCKS=1 → returns the contract fixture with header `x-mock: 1` (frontend can build against it)
 *  otherwise      → 501 naming the contract, so nobody mistakes a stub for a real feature in production.
 * When you implement the endpoint for real: delete the mockOr501 call, keep the fixture for tests.
 */
export function mockOr501(contract: string, fixture: () => unknown, init?: ResponseInit) {
  if (process.env.ENABLE_MOCKS === "1") return NextResponse.json(fixture(), { ...init, headers: { ...init?.headers, "x-mock": "1" } });
  return NextResponse.json({ error: "Not implemented yet", details: { contract } }, { status: 501 });
}
