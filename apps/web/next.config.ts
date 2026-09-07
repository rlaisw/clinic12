import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ["localhost", "10.161.92.117","172.18.206.86", "100.90.231.24", "172.29.135.241", "kilo.clinic.com.hk", "kilo.clinic.com.hk:3001", "kilo.clinic.com.hk:8000"],
  trailingSlash: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://kilo.clinic.com.hk:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
