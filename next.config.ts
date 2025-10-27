import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};
import { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    STACK_AUTH_DOMAIN: 'http://localhost:3000',
    STACK_AUTH_HANDLER_PATH: '/handler',
  },
}

export default nextConfig

export default nextConfig;
