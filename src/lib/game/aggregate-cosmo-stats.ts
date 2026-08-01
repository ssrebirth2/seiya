import type { CosmoPointData, CosmoStatBonus } from '@/lib/game/cosmo-types'
import { cosmoStatKey } from '@/lib/game/format-cosmo-attribute'

export function aggregateCosmoStats(bonuses: CosmoStatBonus[]): CosmoStatBonus[] {
  const map = new Map<string, CosmoStatBonus>()
  for (const bonus of bonuses) {
    const key = cosmoStatKey(bonus)
    const prev = map.get(key)
    map.set(key, prev ? { ...bonus, value: prev.value + bonus.value } : { ...bonus })
  }
  return [...map.values()]
}

export function statsThroughPoints(points: CosmoPointData[], upToIndex: number): CosmoStatBonus[] {
  const slice = points.filter((p) => p.index <= upToIndex)
  return aggregateCosmoStats(slice.flatMap((p) => p.attributes))
}

export function cumulativeUvThroughPoints(points: CosmoPointData[], upToIndex: number): number {
  return points.filter((p) => p.index <= upToIndex).reduce((sum, p) => sum + p.addUv, 0)
}
