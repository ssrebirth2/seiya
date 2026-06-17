import type { Metadata } from 'next'

import { buildEntityMetadata } from '@/lib/metadata/defaults'
import { fetchCompanionMetadata } from '@/lib/metadata/fetch-companion'
import { resolveMetadataLang } from '@/lib/metadata/lang'
import { buildShareUrl } from '@/lib/metadata/share-url'

import CompanionDetailClient from './companion-detail-client'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lang?: string }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params
  const { lang: langParam } = await searchParams
  const lang = resolveMetadataLang(langParam)
  const meta = await fetchCompanionMetadata(Number(id), lang)
  const path = buildShareUrl(`/companions/${id}`, lang)
  return buildEntityMetadata(meta, lang, path)
}

export default function CompanionDetailPage() {
  return <CompanionDetailClient />
}
