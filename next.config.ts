import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Milvus SDK uses gRPC and protobuf which need external imports
  serverExternalPackages: ["@zilliz/milvus2-sdk-node"],
};

export default nextConfig;
