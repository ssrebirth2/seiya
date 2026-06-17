const FALLBACK_SITE_URL = 'http://localhost:3000'

export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (url) return url.replace(/\/$/, '')
  return FALLBACK_SITE_URL
}

export function absoluteUrl(path: string): string {
  if (!path || path === 'IMAGE_UNAVAILABLE') return absoluteUrl('/og-default.png')
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return new URL(path.startsWith('/') ? path : `/${path}`, `${getSiteUrl()}/`).href
}

export const OG_DEFAULT_IMAGE = '/og-default.png'
