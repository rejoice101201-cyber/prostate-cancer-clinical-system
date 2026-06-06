import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy /proxy/* → school HTTP server (avoids self-signed cert issues in browser)
  async rewrites() {
    return [
      {
        source: '/proxy/:path*',
        destination: 'http://140.112.183.111:8000/:path*',
      },
    ]
  },
};

export default nextConfig;
