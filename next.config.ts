import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.ignoreWarnings = [{ module: /node_modules\/chromadb/ }];
    }
    return config;
  },
};

export default nextConfig;
