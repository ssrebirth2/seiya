import type { Metadata } from 'next'

import { SITE_ONLY_LABELS } from '@/lib/i18n/ui-keys'
import { openGraphLocale } from '@/lib/metadata/lang'
import { absoluteUrl, OG_DEFAULT_IMAGE } from '@/lib/metadata/site-url'

export type EntityMetadataPayload = {
  title: string
  description: string
  imageUrl?: string | null
}

export function buildDefaultMetadata(lang = 'EN'): Metadata {
  const title = SITE_ONLY_LABELS.databaseTitle
  const description = 'Hero and skill database viewer for Saint Seiya: Rebirth 2 (EX).'

  return buildEntityMetadata({ title, description }, lang, '/')
}

export function buildEntityMetadata(
  meta: EntityMetadataPayload | null,
  lang: string,
  path: string
): Metadata {
  const title = meta?.title?.trim() || SITE_ONLY_LABELS.databaseTitle
  const description =
    meta?.description?.trim() ||
    'Hero and skill database viewer for Saint Seiya: Rebirth 2 (EX).'
  const imagePath = meta?.imageUrl && meta.imageUrl !== 'IMAGE_UNAVAILABLE'
    ? meta.imageUrl
    : OG_DEFAULT_IMAGE
  const imageUrl = absoluteUrl(imagePath.startsWith('http') ? imagePath : imagePath)

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_ONLY_LABELS.databaseTitle,
      locale: openGraphLocale(lang),
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 512,
          height: 512,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}
