import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // trailingSlash: true, // DISABLED - causes redirect loops with API proxy
  // Suppress warnings about dynamic rendering
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
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
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      const normalized = apiUrl.replace(/\/$/, '');
      return [
        {
          source: '/api/:path*',
          destination: `${normalized}/:path*`,
        },
      ];
    }
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:9090/api/:path*',
      },
    ];
  },
};

export default nextConfig;
