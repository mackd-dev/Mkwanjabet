import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      { source: "/games", destination: "/sports", permanent: false },
      { source: "/games/:path*", destination: "/sports", permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:4010/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;