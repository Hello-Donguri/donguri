import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // Admin forms upload images through Server Actions, validated at up to
      // 5MB (MAX_IMAGE_BYTES in lib/definitions.ts) — the 1MB default
      // rejected them before validation ran. The extra 1MB covers the rest
      // of the form and multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
