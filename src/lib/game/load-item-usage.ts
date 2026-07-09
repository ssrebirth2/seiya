import { supabase } from '@/lib/supabase-client'
import { isItemListed } from '@/lib/game/hidden-item-ids'

export type ItemUsageMeta = {
  artifact_id?: number
  force_card_id?: number
  spirit_id?: number
  box_item_id?: number
  craft_target_id?: number
  exchange_info_id?: number
  host_item_id?: number
  layer?: number
  [key: string]: unknown
}

export type ItemUsageRow = {
  id: string
  item_id: number
  source_table: string
  source_id: number | string
  role: string
  qty?: number | null
  meta?: ItemUsageMeta | null
}

export type ItemUsageDomain =
  | 'craft'
  | 'exchange'
  | 'box'
  | 'hero'
  | 'artifact'
  | 'force_card'
  | 'spirit'
  | 'other'

export type GroupedItemUsage = {
  domain: ItemUsageDomain
  labelKey: string
  entries: ItemUsageRow[]
}

const ROLE_DOMAIN: Record<string, ItemUsageDomain> = {
  craft_ingredient: 'craft',
  craft_target: 'craft',
  exchange_consume: 'exchange',
  exchange_get: 'exchange',
  box_contains: 'box',
  hero_talent: 'hero',
  hero_awaken: 'hero',
  hero_star: 'hero',
  artifact_star: 'artifact',
  artifact_composite: 'artifact',
  force_card_awaken: 'force_card',
  force_card_reborn: 'force_card',
  spirit_star: 'spirit',
  spirit_unlock: 'spirit',
}

const DOMAIN_LABEL_KEYS: Record<ItemUsageDomain, string> = {
  craft: 'LC_COMMON_material_need_item',
  exchange: 'LC_COMMON_material_exchange',
  box: 'LC_ITEM_box_award_tip2',
  hero: 'LC_COMMON_hero',
  artifact: 'LC_COMMON_artifact',
  force_card: 'LC_COMMON_gallery_force_card',
  spirit: 'LC_COMMON_companion',
  other: 'LC_COMMON_material_title',
}

/** Reverse lookup: this item appears as a reward inside other items (boxes, exchanges). */
export const ITEM_REWARD_SOURCE_ROLES = ['box_contains', 'exchange_get'] as const
export type ItemRewardSourceRole = (typeof ITEM_REWARD_SOURCE_ROLES)[number]

export type ItemRewardSourceEntry = {
  id: string
  sourceItemId: number
  role: ItemRewardSourceRole
  qty?: number | null
}

const REWARD_SOURCE_LABEL_KEYS: Record<ItemRewardSourceRole, string> = {
  box_contains: 'LC_ITEM_box_award_tip2',
  exchange_get: 'LC_COMMON_material_exchange',
}

export function rewardSourceLabelKey(role: ItemRewardSourceRole): string {
  return REWARD_SOURCE_LABEL_KEYS[role]
}

export function buildItemRewardSources(
  rows: ItemUsageRow[],
  itemId?: number
): ItemRewardSourceEntry[] {
  const bySource = new Map<string, ItemRewardSourceEntry>()

  for (const row of rows) {
    if (!ITEM_REWARD_SOURCE_ROLES.includes(row.role as ItemRewardSourceRole)) continue

    const sourceItemId = resolveRewardSourceItemId(row)
    if (sourceItemId == null || sourceItemId <= 0) continue

    const role = row.role as ItemRewardSourceRole
    const dedupeKey = `${role}:${sourceItemId}`
    const existing = bySource.get(dedupeKey)
    if (existing) {
      const qty = row.qty ?? 0
      const existingQty = existing.qty ?? 0
      if (qty > existingQty) existing.qty = row.qty
      continue
    }

    bySource.set(dedupeKey, {
      id: dedupeKey,
      sourceItemId,
      role,
      qty: row.qty,
    })
  }

  return [...bySource.values()]
    .filter((entry) => isItemListed(entry.sourceItemId))
    .filter((entry) => itemId == null || entry.sourceItemId !== itemId)
    .sort((a, b) => a.sourceItemId - b.sourceItemId)
}

function resolveRewardSourceItemId(row: ItemUsageRow): number | null {
  const meta = row.meta ?? {}
  if (row.role === 'box_contains') {
    const boxId = meta.box_item_id ?? row.source_id
    const n = typeof boxId === 'number' ? boxId : Number(boxId)
    return Number.isFinite(n) ? n : null
  }
  if (row.role === 'exchange_get') {
    const hostId = meta.host_item_id
    if (hostId != null) {
      const n = typeof hostId === 'number' ? hostId : Number(hostId)
      if (Number.isFinite(n) && n > 0) return n
    }
  }
  return null
}

export function resolveRewardSourceHref(entry: ItemRewardSourceEntry): string {
  return `/items/${entry.sourceItemId}`
}

function parseMeta(raw: unknown): ItemUsageMeta | null {
  if (!raw || typeof raw !== 'object') return null
  return raw as ItemUsageMeta
}

let usageIndexCache: ItemUsageRow[] | null = null
let usageIndexSource: 'supabase' | 'json' | 'none' = 'none'

async function loadUsageIndexJson(): Promise<ItemUsageRow[]> {
  if (usageIndexCache && usageIndexSource === 'json') return usageIndexCache
  try {
    const res = await fetch('/data/item-usage-index.json')
    if (!res.ok) return []
    const data = (await res.json()) as ItemUsageRow[]
    usageIndexCache = data
    usageIndexSource = 'json'
    return data
  } catch {
    return []
  }
}

function mapUsageRow(r: {
  id: string
  item_id: number
  source_table: string
  source_id: number | string
  role: string
  qty?: number | null
  meta?: unknown
}): ItemUsageRow {
  return {
    id: String(r.id),
    item_id: Number(r.item_id),
    source_table: String(r.source_table),
    source_id: r.source_id as number | string,
    role: String(r.role),
    qty: r.qty != null ? Number(r.qty) : null,
    meta: parseMeta(r.meta),
  }
}

function mergeUsageRows(primary: ItemUsageRow[], secondary: ItemUsageRow[]): ItemUsageRow[] {
  const merged = new Map<string, ItemUsageRow>()
  for (const row of primary) merged.set(row.id, row)
  for (const row of secondary) merged.set(row.id, row)
  return [...merged.values()]
}

export async function loadItemUsageRows(itemId: number): Promise<ItemUsageRow[]> {
  const jsonRowsPromise = loadUsageIndexJson().then((all) =>
    all.filter((r) => r.item_id === itemId)
  )

  const { data, error } = await supabase
    .from('ItemUsageIndex')
    .select('id,item_id,source_table,source_id,role,qty,meta')
    .eq('item_id', itemId)

  const jsonRows = await jsonRowsPromise

  if (!error && data) {
    const supabaseRows = data.map((r) =>
      mapUsageRow({
        id: String(r.id),
        item_id: Number(r.item_id),
        source_table: String(r.source_table),
        source_id: r.source_id as number | string,
        role: String(r.role),
        qty: r.qty != null ? Number(r.qty) : null,
        meta: r.meta,
      })
    )
    return mergeUsageRows(supabaseRows, jsonRows)
  }

  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    return jsonRows
  }

  if (error) {
    console.error('ItemUsageIndex query failed:', error.message)
  }

  return jsonRows
}

export function groupItemUsageRows(rows: ItemUsageRow[]): GroupedItemUsage[] {
  const buckets = new Map<ItemUsageDomain, ItemUsageRow[]>()

  for (const row of rows) {
    const domain = ROLE_DOMAIN[row.role] ?? 'other'
    if (!buckets.has(domain)) buckets.set(domain, [])
    buckets.get(domain)!.push(row)
  }

  const order: ItemUsageDomain[] = [
    'craft',
    'exchange',
    'box',
    'hero',
    'artifact',
    'force_card',
    'spirit',
    'other',
  ]

  return order
    .filter((d) => buckets.has(d))
    .map((domain) => ({
      domain,
      labelKey: DOMAIN_LABEL_KEYS[domain],
      entries: buckets.get(domain)!,
    }))
}

export function resolveUsageHref(row: ItemUsageRow): string | null {
  const meta = row.meta ?? {}
  if (meta.hero_id) return `/heroes/${meta.hero_id}`
  if (meta.artifact_id) return `/artifacts/${meta.artifact_id}`
  if (meta.force_card_id) return `/force-cards/${meta.force_card_id}`
  if (meta.spirit_id) return `/companions/${meta.spirit_id}`
  if (meta.box_item_id) return `/items/${meta.box_item_id}`
  if (meta.host_item_id) return `/items/${meta.host_item_id}`
  if (meta.craft_target_id) return `/items/${meta.craft_target_id}`
  if (row.role === 'box_contains' && typeof row.source_id === 'number') {
    return `/items/${row.source_id}`
  }
  return null
}
