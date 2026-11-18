import { describe, expect, it, vi } from "vitest";
import { declaredBodyExceedsLimit, readBodyLimited, RequestBodyTooLargeError } from "@/server/read-body";

const limit = 1_048_576;

describe("bounded request body reader", () => {
  it("reads a valid body up to the exact byte limit", async () => {
    const body = "x".repeat(limit);
    await expect(readBodyLimited(new Request("http://localhost", { method: "POST", body }), limit))
      .resolves.toBe(body);
  });

  it("rejects oversized declared content length before reading", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "content-length": String(limit + 1) },
      body: "small",
    });
    expect(declaredBodyExceedsLimit(request, limit)).toBe(true);
    await expect(readBodyLimited(request, limit)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("rejects oversized streamed bodies and cancels the stream", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(limit));
        controller.enqueue(new Uint8Array(1));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request("http://localhost", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readBodyLimited(request, limit)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
    expect(cancelled).toBe(true);
  });

  it("rejects malformed declared lengths", () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "content-length": "1e9" },
      body: "small",
    });
    expect(() => declaredBodyExceedsLimit(request, limit)).toThrow(SyntaxError);
  });
});
