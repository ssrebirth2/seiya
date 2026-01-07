import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    appDir: true, // ✅ Ativa suporte ao App Router
  },
}

export default nextConfig
