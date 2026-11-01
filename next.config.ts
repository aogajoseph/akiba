import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // The group creation form accepts images up to 5 MB.
      // Leave a little room for multipart form-data overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
