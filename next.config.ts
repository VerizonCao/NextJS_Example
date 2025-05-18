import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['rita-avatar-image.s3.us-west-2.amazonaws.com'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increased to 10MB to handle audio file uploads
    },
  },
  productionBrowserSourceMaps: true, // Enable source maps in production
  // You can enable this later if needed:
  // experimental: {
  //   ppr: 'incremental',
  // },
};

export default nextConfig;
