import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The fonts the card is drawn with are read at runtime, so tracing cannot
  // find them from the import graph.
  outputFileTracingIncludes: { "/opengraph-image": ["./assets/**"] },
};

export default nextConfig;
