import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media-photos.depop.com",
      },
      {
        protocol: "https",
        hostname: "**.ebayimg.com",
      },
      {
        protocol: "https",
        hostname: "i.ebayimg.com",
      },
    ],
  },
};

export default nextConfig;
