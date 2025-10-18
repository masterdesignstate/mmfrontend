import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // trailingSlash: true, // DISABLED - causes redirect loops with API proxy
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'blobmm.blob.core.windows.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
        port: '',
        pathname: '/**',
      },
    ],
  },
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
