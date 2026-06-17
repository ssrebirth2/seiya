'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase-client'
import { queryKeys } from '@/lib/query/query-keys'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'
import { isHeroListed } from '@/lib/game/hidden-hero-ids'
import { isForceCardListed } from '@/lib/game/hidden-force-card-ids'

async function fetchCatalogCounts() {
  const [heroes, artifacts, companions, forceCards] = await Promise.all([
    supabase.from('RoleConfig').select('id', { count: 'exact', head: true }).lte('id', 1499),
    supabase.from('ArtifactConfig').select('id', { count: 'exact', head: true }),
    supabase.from('SpiritConfig').select('id', { count: 'exact', head: true }),
    supabase.from('ForceCardItemConfig').select('id', { count: 'exact', head: true }),
  ])

  const [{ data: heroRows }, { data: cardRows }] = await Promise.all([
    supabase.from('RoleConfig').select('id').lte('id', 1499),
    supabase.from('ForceCardItemConfig').select('id'),
  ])

  const heroCount = heroRows?.filter((h) => isHeroListed(h.id)).length ?? heroes.count ?? 0
  const forceCardCount =
    cardRows?.filter((c) => isForceCardListed(c.id)).length ?? forceCards.count ?? 0

  return {
    heroes: heroCount,
    artifacts: artifacts.count ?? 0,
    companions: companions.count ?? 0,
    forceCards: forceCardCount,
  }
}

export function useCatalogCounts() {
  return useQuery({
    queryKey: queryKeys.catalogCounts,
    queryFn: fetchCatalogCounts,
    staleTime: GAME_CONFIG_STALE_MS,
  })
}
