import type { NextConfig } from "next";
import { getApiBaseUrl } from "./src/config/api-base";

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
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  skipTrailingSlashRedirect: true,
  async rewrites() {
    // Use the same base URL logic as api.ts
    const apiUrl = getApiBaseUrl();
    const normalized = apiUrl.replace(/\/$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${normalized}/:path*`,
      },
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
};

export default nextConfig;
