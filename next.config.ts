import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  ...(process.env.CI || process.env.PLAYWRIGHT ? { devIndicators: { buildActivity: false } } : {}),
  transpilePackages: ["maplibre-gl"],
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "http", hostname: "localhost", port: "3000" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
              "worker-src blob: 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
