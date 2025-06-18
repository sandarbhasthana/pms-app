import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/resources/:path*",
        destination: "/resources/:path*"
      },
      {
        source: "/resources/advanced-threads",
        destination: "/resources/advanced-threads/"
      },
      {
        source: "/resources/advanced-threads/:file*",
        destination: "/resources/advanced-threads/:file*"
      }
    ];
  }
};

export default nextConfig;
