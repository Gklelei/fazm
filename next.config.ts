import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build anywhere, ship only .next/standalone: the production server has
  // too little RAM to run `next build` itself.
  output: "standalone",
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === "production",
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "http://127.0.0.1:80/uploads/:path*",
      },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
