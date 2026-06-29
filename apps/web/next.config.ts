import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @riffle/types is a source-only workspace package; Next must transpile it.
  transpilePackages: ["@riffle/types"],
};

export default nextConfig;
