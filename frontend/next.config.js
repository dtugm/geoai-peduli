/** @type {import('next').NextConfig} */
const nextConfig = {
  // Root repo punya package.json sendiri (SDK Railway), jadi kunci root ke frontend/
  outputFileTracingRoot: __dirname,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
