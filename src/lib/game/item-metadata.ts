import { supabase } from '@/lib/supabase-client'
import { ITEM_BAG_TABS } from '@/lib/game/item-catalog'

export type ItemTypeConfigRow = {
  id: number
  itemType: number
  name: string
}

let typeConfigCache: ItemTypeConfigRow[] | null = null

export async function loadItemTypeConfig(): Promise<ItemTypeConfigRow[]> {
  if (typeConfigCache) return typeConfigCache
  const { data } = await supabase
    .from('ItemTypeConfig')
    .select('id,itemType,name')
    .order('id')
  typeConfigCache = (data ?? []).map((r) => ({
    id: Number(r.id),
    itemType: Number(r.itemType ?? r.id),
    name: String(r.name ?? ''),
  }))
  return typeConfigCache
}

export function bagTabNameKey(itemType: number | string | null | undefined): string {
  const t = String(itemType ?? '0')
  const tab = ITEM_BAG_TABS.find((x) => x.itemType === t)
  return tab?.nameKey ?? ITEM_BAG_TABS[0].nameKey
}

export function formatChildType(childType: unknown): string {
  if (childType == null || childType === '') return ''
  return String(childType)
}

export function formatStackMax(maxNum: unknown): string | null {
  if (maxNum == null || maxNum === '') return null
  const n = Number(maxNum)
  return Number.isFinite(n) && n > 0 ? String(n) : null
}

export function formatRareFlag(isRare: unknown): boolean {
  if (isRare === true || isRare === 1 || isRare === '1') return true
  return false
}
