import { consumeRefKey } from '@/lib/game/load-hero-talents-bundle'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import type { TalentLayerData, TalentLayerSkill } from '@/lib/game/talent-types'

export function aggregateConsume(items: ConsumeEntry[]): ConsumeEntry[] {
  const map = new Map<string, ConsumeEntry>()
  for (const item of items) {
    const key = consumeRefKey(item)
    const prev = map.get(key)
    map.set(key, prev ? { ...item, num: prev.num + item.num } : { ...item })
  }
  return [...map.values()]
}

export function layerAwakeningMaterials(
  skill: Pick<TalentLayerSkill, 'consume' | 'heroConsume'>
): ConsumeEntry[] {
  return aggregateConsume([...skill.consume, ...skill.heroConsume])
}

export function cumulativeAwakeningMaterials(
  layers: TalentLayerData[],
  upToIndex: number
): ConsumeEntry[] {
  const items = layers
    .slice(0, upToIndex + 1)
    .flatMap((layer) => [...layer.layerSkill.consume, ...layer.layerSkill.heroConsume])
  return aggregateConsume(items)
}
