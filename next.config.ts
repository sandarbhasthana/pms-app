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
  },
  images: {
    // Option A: simple domains list
    domains: ["pms-app-updated.s3.eu-north-1.amazonaws.com"]
    // Option B: more flexible pattern matching
    // remotePatterns: [
    //   {
    //     protocol: "https",
    //     hostname: "pms-app-updated.s3.eu-north-1.amazonaws.com",
    //     port: "",
    //     pathname: "/**"
    //   }
    // ]
  }
};

export default nextConfig;
