import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 로그에서 권장하는 보안 허용 설정
  allowedDevOrigins: ['192.168.0.2', '192.168.0.2:3000'],
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.univstore.com',
      },
      {
        protocol: 'https',
        hostname: 'image.univstore.com',
      },
    ],
  },

  experimental: {
    serverActions: {
      allowedOrigins: ['192.168.0.2:3000', 'localhost:3000'],
    },
  },
  devIndicators: {
    appIsrStatus: false,
  },
};

export default nextConfig;
