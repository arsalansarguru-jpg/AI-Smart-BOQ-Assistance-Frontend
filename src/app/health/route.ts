import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

/**
 * Check backend connectivity from the browser via the Next.js app
 * (e.g. http://localhost:3000/health). The real API health endpoint is
 * on the FastAPI server: {NEXT_PUBLIC_API_URL}/health (port 8000 locally).
 */
export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));

    return NextResponse.json({
      frontend: "ok",
      backend_url: API_BASE,
      backend_reachable: res.ok,
      backend: body,
    });
  } catch {
    return NextResponse.json(
      {
        frontend: "ok",
        backend_url: API_BASE,
        backend_reachable: false,
        hint:
          "FastAPI is not running. In a second terminal: cd backend, activate .venv, then run: python -m uvicorn app.main:app --reload --port 8000. Or open " +
          API_BASE +
          "/health directly.",
      },
      { status: 503 }
    );
  }
}
