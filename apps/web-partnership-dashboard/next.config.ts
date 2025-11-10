import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'r2.everylanguage.app',
      },
    ],
  },
  transpilePackages: ['@everylanguage/shared-types'],
};

export default nextConfig;
