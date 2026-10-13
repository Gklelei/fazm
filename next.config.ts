import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build anywhere, ship only .next/standalone: the production server has
  // too little RAM to run `next build` itself.
  output: "standalone",
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === "production",
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
