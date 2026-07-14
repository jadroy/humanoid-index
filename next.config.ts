import type { NextConfig } from "next";

// Image optimization is on; requires a Node runtime. Set `unoptimized: true`
// inside `images` if redeploying to a pure-static host (S3, GitHub Pages, etc).
const nextConfig: NextConfig = {
  // Allow phone-over-Wi-Fi testing against the dev server (Next 16 blocks
  // cross-origin dev/RSC/HMR requests otherwise → white screen on the device).
  allowedDevOrigins: ["10.0.0.62"],
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
