import { supabase } from '@/lib/supabase-client'
import { translateKeys } from '@/lib/i18n/language-package'
import { bagTabNameKey } from '@/lib/game/item-metadata'
import { resolveLinkedEntity, type LinkedEntity } from '@/lib/game/item-args-resolver'
import {
  buildBoxShowAwards,
  normalizeBoxAwardList,
  resolveExchangeBlocks,
  resolveItemCraftRecipe,
  type ExchangeBlock,
  type ItemCraftRecipe,
} from '@/lib/game/item-business'
import { collectItemLcKeys, resolveItemTexts } from '@/lib/game/item-i18n'
import { resolveItemGetPathByRegion, type ItemGetPathRegionGroup } from '@/lib/game/item-get-path'
import { loadRelatedItems, type RelatedItemEntry } from '@/lib/game/load-item-related'
import {
  buildItemRewardSources,
  groupItemUsageRows,
  loadItemUsageRows,
  type GroupedItemUsage,
  type ItemRewardSourceEntry,
  type ItemUsageRow,
} from '@/lib/game/load-item-usage'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { loadConsumeRefMap } from '@/lib/game/load-consume-ref-map'
import { normalizeConsumeList } from '@/lib/game/parse-game-data'
import { loadItemStageSourceLines, splitStageRewardLines, type ItemStageRewardLine } from '@/lib/game/item-stage-rewards'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'

export type ItemConfigRow = {
  id: number
  name: string
  desc: string
  type: number | string | null
  child_type: number | string | null
  quality: number
  icon_path?: string | null
  max_num?: number | string | null
  isRare?: boolean | number | string | null
  compose?: number | string | null
  args?: number | string | null
  get_path?: unknown
  des_value?: unknown
}

export type ItemDetailBundle = {
  item: ItemConfigRow
  translations: Record<string, string>
  resolvedName: string
  resolvedDescHtml?: string
  craftRecipe: ItemCraftRecipe | null
  exchangeBlocks: ExchangeBlock[]
  stageRewardLines: ItemStageRewardLine[]
  progressRewardLines: ItemStageRewardLine[]
  exchangeUnlockLines: ItemStageRewardLine[]
  boxShowAwards: ReturnType<typeof buildBoxShowAwards>
  boxConsumeAwards: ConsumeEntry[]
  usageRows: ItemUsageRow[]
  groupedUsage: GroupedItemUsage[]
  rewardSources: ItemRewardSourceEntry[]
  relatedItems: RelatedItemEntry[]
  linkedEntity: LinkedEntity | null
  getPathByRegion: ItemGetPathRegionGroup[]
  consumeRefMap: ConsumeRefMap
}

const toNum = (v: unknown, fallback = 0) => {
  if (v === null || v === undefined) return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function pushConsumeEntry(out: ConsumeEntry[], entry: ConsumeEntry | null | undefined) {
  if (!entry) return
  if (entry.sid || entry.type) out.push(entry)
}

function collectDetailConsumeEntries(input: {
  craftRecipe: ItemCraftRecipe | null
  exchangeBlocks: ExchangeBlock[]
  boxShowAwards: ReturnType<typeof buildBoxShowAwards>
  boxConsumeAwards: ConsumeEntry[]
  usageRows: ItemUsageRow[]
  relatedItems: RelatedItemEntry[]
  rewardSources: ItemRewardSourceEntry[]
}): ConsumeEntry[] {
  const entries: ConsumeEntry[] = []

  if (input.craftRecipe) {
    for (const c of input.craftRecipe.consume) pushConsumeEntry(entries, c)
    pushConsumeEntry(entries, input.craftRecipe.output)
  }

  for (const block of input.exchangeBlocks) {
    for (const c of [...block.consume, ...block.get]) pushConsumeEntry(entries, c)
  }

  for (const b of input.boxShowAwards) pushConsumeEntry(entries, b.award)
  for (const c of input.boxConsumeAwards) pushConsumeEntry(entries, c)

  for (const u of input.usageRows) {
    if (u.meta?.craft_target_id) {
      pushConsumeEntry(entries, { type: 'prop', sid: toNum(u.meta.craft_target_id), num: 0 })
    }
    if (u.meta?.box_item_id) {
      pushConsumeEntry(entries, { type: 'prop', sid: toNum(u.meta.box_item_id), num: 0 })
    }
    if (u.meta?.host_item_id) {
      pushConsumeEntry(entries, { type: 'prop', sid: toNum(u.meta.host_item_id), num: 0 })
    }
  }

  for (const rel of input.relatedItems) {
    pushConsumeEntry(entries, { type: 'prop', sid: rel.id, num: 0 })
  }

  for (const src of input.rewardSources) {
    pushConsumeEntry(entries, { type: 'prop', sid: src.sourceItemId, num: 0 })
  }

  return entries
}

import { isItemListed } from '@/lib/game/hidden-item-ids'

export async function loadItemDetail(itemId: number, lang: string): Promise<ItemDetailBundle | null> {
  if (!isItemListed(itemId)) return null

  const [itemRes, usageRows] = await Promise.all([
    supabase
      .from('ItemConfig')
      .select(
        'id,name,desc,type,child_type,quality,icon_path,max_num,isRare,compose,args,get_path,des_value'
      )
      .eq('id', itemId)
      .maybeSingle(),
    loadItemUsageRows(itemId),
  ])

  const row = itemRes.data
  if (itemRes.error || !row) return null

  const item: ItemConfigRow = {
    id: toNum(row.id),
    name: String(row.name),
    desc: String(row.desc ?? ''),
    type: row.type ?? null,
    child_type: row.child_type ?? null,
    quality: toNum(row.quality, 0),
    icon_path: row.icon_path ?? null,
    max_num: row.max_num ?? null,
    isRare: row.isRare ?? null,
    compose: row.compose ?? null,
    args: row.args ?? null,
    get_path: row.get_path ?? null,
    des_value: row.des_value ?? null,
  }

  const composeId = toNum(item.compose, 0)
  const compositeLookupId = composeId > 0 ? composeId : itemId
  const [compositeRes, exchangeRes, boxShowRes, boxConsumeRes, relatedItems] =
    await Promise.all([
      supabase
        .from('CompositeConfig')
        .select('id,consume')
        .eq('id', compositeLookupId)
        .maybeSingle(),
      supabase.from('ExchangeConfig').select('id,compose_id,decompose_id,exchange_id').eq('id', itemId),
      supabase.from('BoxAwardShowConfig').select('id,awards,rate_list').eq('id', itemId).maybeSingle(),
      supabase.from('BoxAwardConsumeConfig').select('id,awards').eq('id', itemId).maybeSingle(),
      loadRelatedItems(itemId, {
        compose: item.compose,
        childType: item.child_type,
        usageRows,
      }),
    ])

  const craftConsume = compositeRes.data
    ? normalizeConsumeList((compositeRes.data as { consume: unknown }).consume)
    : []

  const rawExchanges = (exchangeRes.data ?? []) as {
    compose_id?: number
    decompose_id?: number
    exchange_id?: number
  }[]

  const opIds = rawExchanges.flatMap((e) =>
    [e.compose_id, e.decompose_id, e.exchange_id].filter((x) => x != null).map(Number)
  )
  const uniqueOpIds = [...new Set(opIds)]

  let exInfoById: Record<number, { consume_item?: unknown; get_item?: unknown }> = {}
  if (uniqueOpIds.length) {
    const { data: infos } = await supabase
      .from('ExchangeInfoConfig')
      .select('id,consume_item,get_item')
      .in('id', uniqueOpIds)
    for (const r of infos ?? []) {
      exInfoById[toNum((r as { id: number }).id)] = r as { consume_item?: unknown; get_item?: unknown }
    }
  }

  const resolvedExchanges = rawExchanges.map((row) => ({
    compose: row.compose_id ? exInfoById[toNum(row.compose_id)] ?? null : null,
    decompose: row.decompose_id ? exInfoById[toNum(row.decompose_id)] ?? null : null,
    exchange: row.exchange_id ? exInfoById[toNum(row.exchange_id)] ?? null : null,
  }))

  const exchangeBlocks = resolveExchangeBlocks(resolvedExchanges)

  let craftRecipe =
    craftConsume.length > 0
      ? resolveItemCraftRecipe(compositeLookupId, craftConsume, resolvedExchanges)
      : null

  if (!craftRecipe) {
    const targetIds = [
      ...new Set(
        usageRows
          .filter((r) => r.role === 'craft_ingredient' && r.meta?.craft_target_id)
          .map((r) => toNum(r.meta!.craft_target_id, 0))
          .filter((id) => id > 0)
      ),
    ]

    if (targetIds.length) {
      const { data: composites } = await supabase
        .from('CompositeConfig')
        .select('id,consume')
        .in('id', targetIds)

      for (const row of composites ?? []) {
        const targetId = toNum((row as { id: number }).id)
        const consume = normalizeConsumeList((row as { consume: unknown }).consume)
        if (!consume.some((c) => c.sid === itemId)) continue
        craftRecipe = resolveItemCraftRecipe(targetId, consume, resolvedExchanges)
        if (craftRecipe) break
      }
    }
  }

  const childType = item.child_type
  const isRandomBox =
    String(childType).toLowerCase() === 'randombox' ||
    String(childType).toLowerCase() === 'randombox_psychedelic' ||
    String(childType).toLowerCase() === 'firework'

  const boxShowAwards = boxShowRes.data
    ? buildBoxShowAwards(
        (boxShowRes.data as { awards: unknown }).awards,
        (boxShowRes.data as { rate_list: unknown }).rate_list,
        isRandomBox
      )
    : []

  const boxConsumeAwards = boxConsumeRes.data
    ? normalizeBoxAwardList((boxConsumeRes.data as { awards: unknown }).awards)
    : []

  const linkedEntity = resolveLinkedEntity(item.args, item.child_type)
  const groupedUsage = groupItemUsageRows(usageRows)
  const rewardSources = buildItemRewardSources(usageRows, itemId)

  const consumeRefEntries = collectDetailConsumeEntries({
    craftRecipe,
    exchangeBlocks,
    boxShowAwards,
    boxConsumeAwards,
    usageRows,
    relatedItems,
    rewardSources,
  })

  const itemLcKeys = collectItemLcKeys([
    { id: item.id, name: item.name, desc: item.desc, des_value: item.des_value },
  ])
  const allKeys = [...new Set([...itemLcKeys, bagTabNameKey(item.type)])]
  const translations = allKeys.length ? await translateKeys(allKeys, lang) : {}

  const { name: resolvedName, descHtml: resolvedDescHtml } = await resolveItemTexts(
    item,
    lang,
    translations
  )

  const [getPathByRegion, consumeRefMap, stageSources] = await Promise.all([
    resolveItemGetPathByRegion(item.id, lang),
    loadConsumeRefMap(consumeRefEntries, lang),
    loadItemStageSourceLines(item.id, lang),
  ])

  const { chapterRewardLines, progressRewardLines } = splitStageRewardLines(
    stageSources.stageRewardLines
  )

  return {
    item,
    translations,
    resolvedName,
    resolvedDescHtml,
    craftRecipe,
    exchangeBlocks,
    stageRewardLines: chapterRewardLines,
    progressRewardLines,
    exchangeUnlockLines: stageSources.exchangeUnlockLines,
    boxShowAwards,
    boxConsumeAwards,
    usageRows,
    groupedUsage,
    rewardSources,
    relatedItems,
    linkedEntity,
    getPathByRegion,
    consumeRefMap,
  }
}
