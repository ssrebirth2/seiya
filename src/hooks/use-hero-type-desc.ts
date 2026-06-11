'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchHeroTypeDescMap } from '@/lib/game/hero-type-desc'
import { queryKeys } from '@/lib/query/query-keys'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'

export function useHeroTypeDescConfig() {
  return useQuery({
    queryKey: queryKeys.heroTypeDesc,
    queryFn: fetchHeroTypeDescMap,
    staleTime: GAME_CONFIG_STALE_MS,
  })
}
