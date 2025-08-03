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

export default nextConfig;
