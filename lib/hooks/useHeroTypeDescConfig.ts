'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchHeroTypeDescMap } from '@/lib/heroTypeDescConfig'
import { queryKeys } from '@/lib/queryKeys'
import { GAME_CONFIG_STALE_MS } from '@/lib/queryConfig'

export function useHeroTypeDescConfig() {
  return useQuery({
    queryKey: queryKeys.heroTypeDesc,
    queryFn: fetchHeroTypeDescMap,
    staleTime: GAME_CONFIG_STALE_MS,
  })
}
