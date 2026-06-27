import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Clean QR-code URL /r/:trackingId → API handler without exposing /api/
      {
        source: "/r/:trackingId",
        destination: "/api/r/:trackingId",
      },
    ];
  },
};

export default nextConfig;
