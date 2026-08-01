'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-context'
import { loadHeroCosmoBundle } from '@/lib/game/load-hero-cosmo-bundle'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'
import { queryKeys } from '@/lib/query/query-keys'

export function useHeroCosmo(heroId: number) {
  const { lang } = useLanguage()

  return useQuery({
    queryKey: queryKeys.heroCosmo(heroId, lang),
    queryFn: () => loadHeroCosmoBundle(heroId, lang),
    staleTime: GAME_CONFIG_STALE_MS,
    gcTime: GAME_CONFIG_STALE_MS * 2,
    placeholderData: keepPreviousData,
  })
}
