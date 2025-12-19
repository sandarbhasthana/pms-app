import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true"
});

const nextConfig: NextConfig = {
  /* config options here */

  // Allow cross-origin requests in development (for duplicate tabs)
  allowedDevOrigins: [
    "localhost:3000",
    "localhost:4001",
    "127.0.0.1:3000",
    "127.0.0.1:4001"
  ],

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
    // domains: [
    //   process.env.NEXT_PUBLIC_S3_IMAGE_HOSTNAME || "pms-app-updated.s3.eu-north-1.amazonaws.com"
    // ]
    // Option B: more flexible pattern matching
    remotePatterns: [
      {
        protocol: "https",
        hostname:
          process.env.NEXT_PUBLIC_S3_IMAGE_HOSTNAME ||
          "pms-app-updated.s3.eu-north-1.amazonaws.com", // ← comma here
        port: "",
        pathname: "/**"
      }
    ]
  }
};

export default bundleAnalyzer(nextConfig);
