import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
// On Vercel (Root Directory = frontend), use this app folder only.
// Locally in monorepo, include parent for output tracing.
const workspaceRoot =
  process.env.VERCEL === "1" ? appDir : path.resolve(appDir, "..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
