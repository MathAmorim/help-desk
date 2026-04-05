import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.1.97"],
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
