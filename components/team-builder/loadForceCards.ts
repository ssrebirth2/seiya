import { getQueryClient } from '@/lib/query-client'
import { fetchRawEquipmentCatalog } from '@/lib/fetchers/equipmentCatalog'
import { queryKeys } from '@/lib/queryKeys'
import { GAME_CONFIG_STALE_MS } from '@/lib/queryConfig'

export type ForceCard = {
  id: number
  name: string
  quality: number
  condition?: string
}

export async function loadForceCards() {
  const qc = getQueryClient()
  const { forceCards } = await qc.fetchQuery({
    queryKey: queryKeys.equipmentCatalogRaw,
    queryFn: fetchRawEquipmentCatalog,
    staleTime: GAME_CONFIG_STALE_MS,
  })
  return forceCards.map((c) => ({
    ...c,
    condition: c.condition ?? undefined,
  })) as ForceCard[]
}

export function canEquipCard(hero: any, card: ForceCard): boolean {
  if (!card?.condition) return true
  try {
    const conds = JSON.parse(card.condition)
    return conds.every((c: any) => {
      const val =
        c.type === 'stance'
          ? hero.stance
          : c.type === 'occupation'
          ? hero.occupation
          : c.type === 'damagetype'
          ? hero.damagetype
          : c.type === 'camp'
          ? hero.camp
          : null
      return !c.object_id?.length || c.object_id.includes(Number(val))
    })
  } catch {
    return true
  }
}
