import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true, // Enable trailing slashes to match Django URLs
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:9090/api/:path*',
      },
    ];
  },
};

export default nextConfig;
