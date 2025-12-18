/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  images: {
    unoptimized: true,
  },

  experimental: {
    // You are using mongodb on the server
    serverComponentsExternalPackages: ["mongodb"],

    // ✅ Explicitly disable Turbopack since we use webpack config
    turbo: false,
  },

  webpack(config, { dev }) {
    if (dev) {
      // Reduce CPU/memory from file watching on Windows
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules"],
      };
    }
    return config;
  },

  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // ⚠️ NOTE: ALLOWALL is insecure, but keeping as per your config
          { key: "X-Frame-Options", value: "ALLOWALL" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *;",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.CORS_ORIGINS || "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "*",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
