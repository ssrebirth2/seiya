'use client'

import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-context'
import { loadHeroTalentsBundle } from '@/lib/game/load-hero-talents-bundle'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'
import { queryKeys } from '@/lib/query/query-keys'

export function useHeroTalents(heroId: number) {
  const { lang } = useLanguage()

  return useQuery({
    queryKey: queryKeys.heroTalents(heroId, lang),
    queryFn: () => loadHeroTalentsBundle(heroId, lang),
    staleTime: GAME_CONFIG_STALE_MS,
    gcTime: GAME_CONFIG_STALE_MS * 2,
  })
}
