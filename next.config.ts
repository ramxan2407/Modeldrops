import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/platform": ["./public/assets/hero.png"],
    "/api/jobs": ["./public/assets/hero.png"],
  },
  webpack(config, { webpack }) {
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^cloudflare:workers$/,
        path.resolve("lib/vercel/runtime.ts"),
      ),
    );
    return config;
  },
};

export default nextConfig;
