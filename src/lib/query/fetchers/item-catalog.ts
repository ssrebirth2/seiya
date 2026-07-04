import { supabase } from '@/lib/supabase-client'
import {
  isItemCatalogListed,
  type ItemCatalogIndexRow,
} from '@/lib/game/item-catalog'

const toNum = (v: unknown, fallback = 0) => {
  if (v === null || v === undefined) return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

export async function fetchItemCatalogIndex(): Promise<ItemCatalogIndexRow[]> {
  const rows: ItemCatalogIndexRow[] = []
  let lastId = 0
  let guard = 0

  while (true) {
    guard++
    if (guard > 100) break

    const { data, error } = await supabase
      .from('ItemConfig')
      .select('id,name,type,child_type,quality,icon_path,sort_weight,des_value')
      .gt('id', lastId)
      .order('id', { ascending: true })
      .limit(1000)

    if (error) break
    const batch = (data ?? []) as Record<string, unknown>[]
    if (!batch.length) break

    for (const r of batch) {
      const row: ItemCatalogIndexRow = {
        id: toNum(r.id),
        name: String(r.name ?? ''),
        type: toNum(r.type, 0),
        child_type: r.child_type != null ? String(r.child_type) : null,
        quality: toNum(r.quality, 0),
        icon_path: (r.icon_path as string | null) ?? null,
        sort_weight: toNum(r.sort_weight, 0),
        des_value: r.des_value ?? null,
      }
      if (isItemCatalogListed(row)) rows.push(row)
    }

    const newLastId = toNum(batch[batch.length - 1]?.id, lastId)
    if (newLastId <= lastId) break
    lastId = newLastId
    if (batch.length < 1000) break
  }

  return rows
}
