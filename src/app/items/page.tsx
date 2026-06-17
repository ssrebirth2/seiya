import type { Metadata } from 'next'

import { buildEntityMetadata } from '@/lib/metadata/defaults'
import { fetchSectionMetadata } from '@/lib/metadata/fetch-section'
import { resolveMetadataLang } from '@/lib/metadata/lang'
import { buildShareUrl } from '@/lib/metadata/share-url'

import ItemsClient from './items-client'

type PageProps = {
  searchParams: Promise<{ lang?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { lang: langParam } = await searchParams
  const lang = resolveMetadataLang(langParam)
  const meta = await fetchSectionMetadata('items', lang)
  const path = buildShareUrl('/items', lang)
  return buildEntityMetadata(meta, lang, path)
}

export default function ItemsPage() {
  return <ItemsClient />
}
