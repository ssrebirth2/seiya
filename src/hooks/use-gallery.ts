'use client'

import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-context'
import { loadGalleryBundle } from '@/lib/game/load-gallery-bundle'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'
import { queryKeys } from '@/lib/query/query-keys'

export function useGalleryBundle() {
  const { lang } = useLanguage()
  return useQuery({
    queryKey: queryKeys.galleryBundle(lang),
    queryFn: () => loadGalleryBundle(lang),
    staleTime: GAME_CONFIG_STALE_MS,
  })
}
