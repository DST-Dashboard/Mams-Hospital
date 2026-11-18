import { logger } from "./logger";

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the allowed size");
    this.name = "RequestBodyTooLargeError";
  }
}

export function declaredBodyExceedsLimit(request: Request, maximumBytes: number): boolean {
  const declared = request.headers.get("content-length");
  if (declared === null) return false;
  if (!/^\d+$/.test(declared)) throw new SyntaxError("Invalid Content-Length");
  return Number(declared) > maximumBytes;
}

export async function readBodyLimited(request: Request, maximumBytes: number): Promise<string> {
  if (declaredBodyExceedsLimit(request, maximumBytes)) throw new RequestBodyTooLargeError();
  const reader = request.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        try {
          await reader.cancel();
        } catch (error) {
          logger.warn("Unable to cancel oversized request body", {
            reason: error instanceof Error ? error.message : "Unknown stream cancellation error",
          });
        }
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, totalBytes).toString("utf8");
}
