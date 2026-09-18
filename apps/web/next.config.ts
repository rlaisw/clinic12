import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ["localhost", "10.161.92.117","172.18.206.86", "100.90.231.24", "172.29.135.241", "vps.tailb5775.ts.net", "vps.tailb5775.ts.net:3001", "vps.tailb5775.ts.net:8000"],
  trailingSlash: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://vps.tailb5775.ts.net:8000/api/:path*",
      },
      {
        source: "/chat/:path*",
        destination: "https://10.0.1.75/chat/:path*",
      },
    ];
  },
};

export default nextConfig;
