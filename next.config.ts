import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rita-avatar-image.s3.us-west-2.amazonaws.com',
        pathname: '/rita-avatars/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increased to 10MB to handle audio file uploads
    },
  },
  async rewrites() {
    return [
      {
        source: '/new-character',
        destination: '/create/new-character',
      },
      {
        source: '/edit-character/:id',
        destination: '/edit/edit-character/:id',
      },
      {
        source: '/character-studio/:id',
        destination: '/edit/character-studio/:id',
      },
    ];
  },
  productionBrowserSourceMaps: true, // Enable source maps in production
  // You can enable this later if needed:
  // experimental: {
  //   ppr: 'incremental',
  // },
};

export default nextConfig;
