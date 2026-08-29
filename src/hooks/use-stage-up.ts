'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-context'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'
import { queryKeys } from '@/lib/query/query-keys'
import {
  loadStageUpCatalog,
  loadStageUpHeroBundle,
  loadStageUpLadders,
} from '@/lib/game/load-stage-up-bundle'

export function useStageUpLadders() {
  return useQuery({
    queryKey: queryKeys.stageUpLadders,
    queryFn: loadStageUpLadders,
    staleTime: GAME_CONFIG_STALE_MS,
  })
}

export function useStageUpCatalog() {
  return useQuery({
    queryKey: queryKeys.stageUpCatalog,
    queryFn: loadStageUpCatalog,
    staleTime: GAME_CONFIG_STALE_MS,
  })
}

export function useStageUpHero(heroId: number | null) {
  const { lang } = useLanguage()
  const laddersQuery = useStageUpLadders()

  return useQuery({
    queryKey: queryKeys.stageUpHero(heroId ?? 0, lang),
    queryFn: () => loadStageUpHeroBundle(heroId!, lang, laddersQuery.data!),
    enabled: heroId != null && heroId > 0 && laddersQuery.isSuccess,
    staleTime: GAME_CONFIG_STALE_MS,
    gcTime: GAME_CONFIG_STALE_MS * 2,
    placeholderData: keepPreviousData,
  })
}
