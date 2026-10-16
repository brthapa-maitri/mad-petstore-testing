import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  rewrites: () =>
    Promise.resolve([{ source: "/health", destination: "/api/health" }]),
};

export default nextConfig;
