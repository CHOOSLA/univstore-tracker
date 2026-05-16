import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 로그에서 권장하는 보안 허용 설정
  allowedDevOrigins: ['192.168.0.2', '192.168.0.2:3000'],
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.univstore.com', // 모든 서브도메인 허용
      },
    ],
  },

  experimental: {
    serverActions: {
      allowedOrigins: ['192.168.0.2:3000', 'localhost:3000'],
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
