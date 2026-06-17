import type { Metadata } from 'next'

import { buildEntityMetadata } from '@/lib/metadata/defaults'
import { fetchArtifactMetadata } from '@/lib/metadata/fetch-artifact'
import { resolveMetadataLang } from '@/lib/metadata/lang'
import { buildShareUrl } from '@/lib/metadata/share-url'

import ArtifactDetailClient from './artifact-detail-client'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lang?: string }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params
  const { lang: langParam } = await searchParams
  const lang = resolveMetadataLang(langParam)
  const meta = await fetchArtifactMetadata(Number(id), lang)
  const path = buildShareUrl(`/artifacts/${id}`, lang)
  return buildEntityMetadata(meta, lang, path)
}

export default function ArtifactDetailPage() {
  return <ArtifactDetailClient />
}
