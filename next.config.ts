import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['rita-avatar-image.s3.us-west-2.amazonaws.com'],
  },
  // You can enable this later if needed:
  // experimental: {
  //   ppr: 'incremental',
  // },
};

export default nextConfig;
