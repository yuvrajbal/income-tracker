import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets other devices on your Tailscale network load the dev server (by IP or MagicDNS name).
  allowedDevOrigins: ["100.*.*.*", "yuvraj-bal", "**.ts.net"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
