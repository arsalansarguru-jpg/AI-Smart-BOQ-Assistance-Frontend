import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: appDir,
  experimental: {
    webpackMemoryOptimizations: true,
    cpus: 1,
    optimizePackageImports: ["@supabase/supabase-js", "@supabase/ssr", "sonner"],
  },
  onDemandEntries: {
    maxInactiveAge: 30 * 1000,
    pagesBufferLength: 1,
  },
  turbopack: {},
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
      config.devtool = false;
      config.parallelism = 1;
      config.optimization = {
        ...config.optimization,
        minimize: false,
        splitChunks: false,
        runtimeChunk: false,
      };
    }
    return config;
  },
};

export default nextConfig;
