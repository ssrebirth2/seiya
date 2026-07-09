import { supabase } from '@/lib/supabase-client'
import { normalizeConsumeList } from '@/lib/game/parse-game-data'
import { isItemListed } from '@/lib/game/hidden-item-ids'

export type RelatedItemEntry = {
  id: number
  relation: 'compose_parent' | 'compose_child' | 'box_source'
  labelKey?: string
}

const toNum = (v: unknown, fallback = 0) => {
  if (v === null || v === undefined) return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

export async function loadRelatedItems(
  itemId: number,
  opts: {
    compose?: unknown
    childType?: unknown
    usageRows?: { role: string; source_id: number | string; meta?: { box_item_id?: number } | null }[]
  } = {}
): Promise<RelatedItemEntry[]> {
  const related: RelatedItemEntry[] = []
  const seen = new Set<number>()

  const add = (id: number, relation: RelatedItemEntry['relation'], labelKey?: string) => {
    if (id <= 0 || id === itemId || seen.has(id) || !isItemListed(id)) return
    seen.add(id)
    related.push({ id, relation, labelKey })
  }

  const composeId = toNum(opts.compose, 0)
  if (composeId > 0) {
    add(composeId, 'compose_parent', 'LC_COMMON_compose')

    const { data: composite } = await supabase
      .from('CompositeConfig')
      .select('id,consume')
      .eq('id', composeId)
      .maybeSingle()

    if (composite) {
      for (const ing of normalizeConsumeList((composite as { consume: unknown }).consume)) {
        if (ing.sid) add(Number(ing.sid), 'compose_child')
      }
    }
  }

  if (String(opts.childType ?? '').toLowerCase() === 'item_chip' && composeId > 0) {
    add(composeId, 'compose_parent', 'LC_COMMON_compose_fragment')
  }

  for (const row of opts.usageRows ?? []) {
    if (row.role !== 'box_contains') continue
    const boxId = toNum(row.meta?.box_item_id ?? row.source_id, 0)
    if (boxId > 0) add(boxId, 'box_source', 'LC_ITEM_box_award_tip2')
  }

  return related
}
