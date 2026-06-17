import type { Metadata } from 'next'

import { buildEntityMetadata } from '@/lib/metadata/defaults'
import { fetchForceCardMetadata } from '@/lib/metadata/fetch-force-card'
import { resolveMetadataLang } from '@/lib/metadata/lang'
import { buildShareUrl } from '@/lib/metadata/share-url'

import ForceCardDetailClient from './force-card-detail-client'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lang?: string }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params
  const { lang: langParam } = await searchParams
  const lang = resolveMetadataLang(langParam)
  const meta = await fetchForceCardMetadata(Number(id), lang)
  const path = buildShareUrl(`/force-cards/${id}`, lang)
  return buildEntityMetadata(meta, lang, path)
}

export default function ForceCardDetailPage() {
  return <ForceCardDetailClient />
}
