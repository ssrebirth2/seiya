import type { Metadata } from 'next'

import { buildEntityMetadata } from '@/lib/metadata/defaults'
import { fetchSectionMetadata } from '@/lib/metadata/fetch-section'
import { resolveMetadataLang } from '@/lib/metadata/lang'
import { buildShareUrl } from '@/lib/metadata/share-url'

import TeamBuilderClient from './team-builder-client'

type PageProps = {
  searchParams: Promise<{ lang?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { lang: langParam } = await searchParams
  const lang = resolveMetadataLang(langParam)
  const meta = await fetchSectionMetadata('team-builder', lang)
  const path = buildShareUrl('/team-builder', lang)
  return buildEntityMetadata(meta, lang, path)
}

export default function TeamBuilderPage() {
  return <TeamBuilderClient />
}
