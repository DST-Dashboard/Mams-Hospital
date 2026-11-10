export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function fetcher<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "same-origin" });
  if (r.status === 401 && typeof window !== "undefined") window.location.assign(`/login?next=${encodeURIComponent(location.pathname)}`);
  if (!r.ok) throw new ApiError(r.status, ((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? r.statusText);
  return r.json() as Promise<T>;
}
export const post = async (url: string, body?: unknown) => {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
  if (!r.ok) throw new ApiError(r.status, ((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? r.statusText);
  return r.json();
};
