import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Milvus SDK uses gRPC and protobuf which need external imports
      config.externals = config.externals || [];
      config.externals.push({
        "@zilliz/milvus2-sdk-node": "commonjs @zilliz/milvus2-sdk-node",
      });
    }
    return config;
  },
};

export default nextConfig;
