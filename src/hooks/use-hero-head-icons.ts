'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchHeroHeadIconMap } from '@/lib/game/fetch-hero-head-icons'
import { queryKeys } from '@/lib/query/query-keys'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'

export function useHeroHeadIconMap() {
  return useQuery({
    queryKey: queryKeys.heroHeadIcons,
    queryFn: fetchHeroHeadIconMap,
    staleTime: GAME_CONFIG_STALE_MS,
  })
}
