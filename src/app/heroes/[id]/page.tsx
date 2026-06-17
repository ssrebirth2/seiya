import type { Metadata } from 'next'

import { buildEntityMetadata } from '@/lib/metadata/defaults'
import { fetchHeroMetadata } from '@/lib/metadata/fetch-hero'
import { resolveMetadataLang } from '@/lib/metadata/lang'
import { buildShareUrl } from '@/lib/metadata/share-url'

import HeroDetailClient from './hero-detail-client'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lang?: string }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params
  const { lang: langParam } = await searchParams
  const lang = resolveMetadataLang(langParam)
  const meta = await fetchHeroMetadata(Number(id), lang)
  const path = buildShareUrl(`/heroes/${id}`, lang)
  return buildEntityMetadata(meta, lang, path)
}

export default function HeroDetailPage() {
  return <HeroDetailClient />
}
