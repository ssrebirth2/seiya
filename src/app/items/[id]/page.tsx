import type { Metadata } from 'next'

import { buildEntityMetadata } from '@/lib/metadata/defaults'
import { fetchItemMetadata } from '@/lib/metadata/fetch-item'
import { resolveMetadataLang } from '@/lib/metadata/lang'
import { buildShareUrl } from '@/lib/metadata/share-url'

import ItemDetailClient from './item-detail-client'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lang?: string }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params
  const { lang: langParam } = await searchParams
  const lang = resolveMetadataLang(langParam)
  const meta = await fetchItemMetadata(Number(id), lang)
  const path = buildShareUrl(`/items/${id}`, lang)
  return buildEntityMetadata(meta, lang, path)
}

export default function ItemDetailPage() {
  return <ItemDetailClient />
}
