import type { NextConfig } from "next";

// Image optimization is on; requires a Node runtime. Set `unoptimized: true`
// inside `images` if redeploying to a pure-static host (S3, GitHub Pages, etc).
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
