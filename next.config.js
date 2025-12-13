/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  // output: 'export',
  //  trailingSlash: true,
  // images: {
  //   unoptimized: true
  // },
  // assetPrefix: './',
  // Only enable export mode for production builds
  ...(process.env.BUILD_FOR_ELECTRON === 'true' && {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true
    },
    assetPrefix: './',
  }),
};

module.exports = nextConfig;