import { getQueryClient } from '@/lib/query-client'
import { fetchRawEquipmentCatalog } from '@/lib/fetchers/equipmentCatalog'
import { queryKeys } from '@/lib/queryKeys'
import { GAME_CONFIG_STALE_MS } from '@/lib/queryConfig'

export type Artifact = {
  id: number
  name: string
  initial_quality: number
  limit?: string
}

export async function loadArtifacts() {
  const qc = getQueryClient()
  const { artifacts } = await qc.fetchQuery({
    queryKey: queryKeys.equipmentCatalogRaw,
    queryFn: fetchRawEquipmentCatalog,
    staleTime: GAME_CONFIG_STALE_MS,
  })
  return artifacts as Artifact[]
}

export function canEquipArtifact(hero: any, artifact: Artifact): boolean {
  if (!artifact?.limit) return true
  try {
    const limits = JSON.parse(artifact.limit)
    return limits.every((c: any) => {
      const val =
        c.type === 'stance'
          ? hero.stance
          : c.type === 'damagetype'
          ? hero.damagetype
          : c.type === 'occupation'
          ? hero.occupation
          : c.type === 'camp'
          ? hero.camp
          : null
      return !c.value?.length || c.value.includes(Number(val))
    })
  } catch {
    return true
  }
}
