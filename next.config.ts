import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // elk.js is browser-only; exclude from server bundle
  serverExternalPackages: ["elkjs"],

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle elkjs on the server
      config.externals = [...(config.externals || []), "elkjs"];
    }
    return config;
  },
};

export default nextConfig;
