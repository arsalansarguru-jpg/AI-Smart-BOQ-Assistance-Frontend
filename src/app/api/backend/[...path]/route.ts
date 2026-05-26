import { NextRequest, NextResponse } from "next/server";
import { getServerBackendUrl } from "@/lib/backend-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
]);

function buildTargetUrl(pathSegments: string[], search: string): string {
  const base = getServerBackendUrl();
  
  // Strip duplicate 'api' segment if it's the first segment to prevent double prefixing
  let cleanSegments = [...pathSegments];
  if (cleanSegments[0] === "api") {
    cleanSegments.shift();
  }
  
  const path = cleanSegments.map(encodeURIComponent).join("/");
  const suffix = base.endsWith("/api") || base.endsWith("/api/") ? "" : "/api";
  return `${base}${suffix}/${path}${search}`;
}

async function proxy(request: NextRequest, pathSegments: string[]) {
  const targetUrl = buildTargetUrl(pathSegments, request.nextUrl.search);
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    if (lower === "content-length") return;
    headers.set(key, value);
  });

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not reach extraction API.";
    return NextResponse.json(
      {
        detail:
          "Backend API is unreachable. Deploy FastAPI on Render or Railway (root directory: backend), set API_URL on Vercel, and redeploy. Local dev: run uvicorn on port 8000.",
        error: message,
        backend_url: getServerBackendUrl(),
      },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    responseHeaders.set(key, value);
  });

  const body = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") ?? "";

  if (
    !upstream.ok &&
    contentType.includes("text/html") &&
    body.byteLength > 0
  ) {
    const html = new TextDecoder().decode(body);
    if (/railway/i.test(html) && /not found/i.test(html)) {
      return NextResponse.json(
        {
          detail:
            "Railway returned 404 — the backend service is not running or the API URL is wrong. In Railway: deploy from this repo with Root Directory = backend, enable Public Networking, copy the service URL, set API_URL on Vercel, then redeploy the frontend.",
          backend_url: getServerBackendUrl(),
        },
        { status: 502 }
      );
    }
  }

  return new NextResponse(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}
