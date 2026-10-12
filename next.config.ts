import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const formTargets = ["'self'"];
    if (process.env.SUPABASE_GOOGLE_ENABLED === "true") {
      const authOrigin = new URL(process.env.SUPABASE_URL || "");
      if (
        authOrigin.protocol !== "https:" ||
        authOrigin.username ||
        authOrigin.password
      )
        throw new Error(
          "Google sign-in requires a valid HTTPS Supabase origin.",
        );
      formTargets.push(authOrigin.origin, "https://accounts.google.com");
    }
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            // Google sign-in posts locally then redirects through Supabase and Google.
            // Keep form targets restricted, including the exact enabled OAuth hosts.
            value: `base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action ${formTargets.join(" ")}`,
          },
        ],
      },
    ];
  },
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
