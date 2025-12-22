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
  // For Vercel: Add CORS headers
  ...(!process.env.BUILD_FOR_MOBILE && {
    async headers() {
      return [
        {
          source: '/api/:path*',
          headers: [
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
            { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          ],
        },
      ];
    },
  }),
};

module.exports = nextConfig;