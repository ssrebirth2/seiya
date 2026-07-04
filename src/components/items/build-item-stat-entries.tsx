import type { ItemConfigRow } from '@/lib/game/load-item-detail'
import {
  bagTabNameKey,
  formatChildType,
  formatRareFlag,
  formatStackMax,
} from '@/lib/game/item-metadata'

type StatEntry = {
  key: string
  label: string
  value: string
}

type SiteLabelFn = (
  key: 'id' | 'category' | 'type' | 'stackMax' | 'rarity' | 'rare'
) => string

export function buildItemStatEntries(
  item: ItemConfigRow,
  getT: (key?: string) => string,
  site: SiteLabelFn
): StatEntry[] {
  const stackMax = formatStackMax(item.max_num)
  const childType = formatChildType(item.child_type)

  return [
    {
      key: 'category',
      label: site('category'),
      value: getT(bagTabNameKey(item.type)),
    },
    ...(childType ? [{ key: 'subtype', label: site('type'), value: childType }] : []),
    ...(stackMax ? [{ key: 'stack', label: site('stackMax'), value: stackMax }] : []),
    ...(formatRareFlag(item.isRare)
      ? [{ key: 'rare', label: site('rarity'), value: site('rare') }]
      : []),
  ]
}
