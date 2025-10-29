import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    STACK_AUTH_DOMAIN: 'https://platefull.com.br',
    STACK_AUTH_HANDLER_PATH: '/handler',
  },
};

export default nextConfig;
