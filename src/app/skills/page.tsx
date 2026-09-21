import type { Metadata } from 'next'

import { buildEntityMetadata } from '@/lib/metadata/defaults'
import { fetchSectionMetadata } from '@/lib/metadata/fetch-section'
import { resolveMetadataLang } from '@/lib/metadata/lang'
import { buildShareUrl } from '@/lib/metadata/share-url'

import SkillsClient from './skills-client'

type PageProps = {
  searchParams: Promise<{ lang?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { lang: langParam } = await searchParams
  const lang = resolveMetadataLang(langParam)
  const meta = await fetchSectionMetadata('skills', lang)
  const path = buildShareUrl('/skills', lang)
  return buildEntityMetadata(meta, lang, path)
}

export default function SkillsPage() {
  return <SkillsClient />
}
