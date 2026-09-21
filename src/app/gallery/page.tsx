import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LoadingSkeleton } from '@/components/ui/v2'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import { buildEntityMetadata } from '@/lib/metadata/defaults'
import { fetchSectionMetadata } from '@/lib/metadata/fetch-section'
import { resolveMetadataLang } from '@/lib/metadata/lang'
import { buildShareUrl } from '@/lib/metadata/share-url'

import GalleryClient from './gallery-client'

type PageProps = {
  searchParams: Promise<{ lang?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { lang: langParam } = await searchParams
  const lang = resolveMetadataLang(langParam)
  const meta = await fetchSectionMetadata('gallery', lang)
  const path = buildShareUrl('/gallery', lang)
  return buildEntityMetadata(meta, lang, path)
}

export default function GalleryPage() {
  return (
    <Suspense
      fallback={
        <ListPagePanel>
          <LoadingSkeleton variant="detail" />
        </ListPagePanel>
      }
    >
      <GalleryClient />
    </Suspense>
  )
}
