import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack for Vercel compatibility
  experimental: {
    turbo: {
      rules: {},
    },
  },
};

export default nextConfig;
