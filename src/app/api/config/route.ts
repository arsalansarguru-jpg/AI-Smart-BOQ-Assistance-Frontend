import { NextResponse } from "next/server";
import { getServerBackendUrl } from "@/lib/backend-url";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    backendUrl: getServerBackendUrl(),
  });
}
