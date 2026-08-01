'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-context'
import { loadHeroOverviewBundle } from '@/lib/game/load-hero-overview-bundle'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'
import { queryKeys } from '@/lib/query/query-keys'

export function useHeroOverview(heroId: number) {
  const { lang } = useLanguage()

  return useQuery({
    queryKey: queryKeys.heroOverview(heroId, lang),
    queryFn: () => loadHeroOverviewBundle(heroId, lang),
    staleTime: GAME_CONFIG_STALE_MS,
    gcTime: GAME_CONFIG_STALE_MS * 2,
    placeholderData: keepPreviousData,
  })
}
