import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // vTracer's native binding (a .node file per platform) and Potrace, whose
  // image loader (Jimp) requires its codecs dynamically — loaded with
  // Node's own require rather than bundled. See lib/svg-trace.ts.
  serverExternalPackages: ["@neplex/vectorizer", "potrace"],
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
