import type { MetadataRoute } from 'next'

import { getSiteUrl } from '@/lib/metadata/site-url'

const STATIC_ROUTES = [
  '/',
  '/heroes',
  '/companions',
  '/artifacts',
  '/force-cards',
  '/team-builder',
  '/items',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const lastModified = new Date()

  return STATIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path === '/' ? '' : path}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.8,
  }))
}
