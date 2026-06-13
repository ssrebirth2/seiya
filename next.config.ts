import type { NextConfig } from 'next'
import os from 'node:os'

/** LAN IPv4 hosts so other devices can load dev chunks (Next.js 16 blocks cross-site /_next/* by default). */
function localNetworkOrigins(): string[] {
  const hosts = new Set<string>()
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        hosts.add(iface.address)
      }
    }
  }
  return [...hosts]
}

const extraDevOrigins =
  process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? []

const nextConfig: NextConfig = {
  allowedDevOrigins: [...localNetworkOrigins(), ...extraDevOrigins],
}

export default nextConfig
