import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {
    // Turbopack handles most optimizations automatically
  },

  // Reduce logging verbosity
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
