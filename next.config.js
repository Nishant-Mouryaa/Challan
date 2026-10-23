/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  pageExtensions: ['jsx', 'js'],
  experimental: {
    agentUpgrade: 'security',
  },
};

module.exports = nextConfig;