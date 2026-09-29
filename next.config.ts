import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/inicio",
        permanent: false,
      },
      {
        source: "/historico",
        destination: "/candidaturas",
        permanent: false,
      },
    ];
  },
  output: "standalone",
};

export default nextConfig;
