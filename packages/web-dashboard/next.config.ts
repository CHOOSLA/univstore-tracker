import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 로그에서 권장하는 보안 허용 설정
  allowedDevOrigins: ['192.168.0.2', '192.168.0.2:3000'],
  
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
