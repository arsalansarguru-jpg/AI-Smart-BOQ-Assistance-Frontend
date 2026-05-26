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
    // If the direct backend URL has been fetched and cached, use it directly to bypass Vercel body limits
    const cached = (window as any).__BACKEND_URL__;
    if (cached) return cached;

    // Start background fetch for the config if not already running
    if (!(window as any).__FETCHING_BACKEND_URL__) {
      (window as any).__FETCHING_BACKEND_URL__ = true;
      fetch("/api/config")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.backendUrl) {
            (window as any).__BACKEND_URL__ = data.backendUrl;
          }
        })
        .catch(() => {});
    }
    return "/api/backend";
  }
  return getServerBackendUrl();
}

export function normalizeBackendBaseUrl(raw: string | undefined): string {
  const trimmed = (raw ?? "http://localhost:8000").trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
