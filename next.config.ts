import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.13", "localhost"],
  async redirects() {
    return [
      {
        source: "/para-produtores",
        destination: "/como-funciona",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
