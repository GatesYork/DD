import type { NextConfig } from 'next';
const config: NextConfig = { transpilePackages: ['@dd/domain', '@dd/validation'] };
export default config;
