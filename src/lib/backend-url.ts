/** Server-side FastAPI base URL (Render/Railway/local). */
export function getServerBackendUrl(): string {
  const raw =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";
  return normalizeBackendBaseUrl(raw);
}

/** Browser calls same-origin proxy; server calls FastAPI directly. */
export function getClientApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api/backend";
  }
  return getServerBackendUrl();
}

export function normalizeBackendBaseUrl(raw: string | undefined): string {
  const trimmed = (raw ?? "http://localhost:8000").trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
