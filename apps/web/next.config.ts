import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // typescript.ignoreBuildErrors intentionally NOT set — type errors must
  // block the build so bugs are caught at compile time instead of shipping
  // to production.
};

export default nextConfig;
