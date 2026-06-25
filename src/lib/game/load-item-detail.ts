import { supabase } from '@/lib/supabase-client'
import { translateKeys } from '@/lib/i18n/language-package'
import {
  buildBoxShowAwards,
  hasCraftRecipe,
  normalizeAwardList,
  resolveExchangeBlocks,
  type ExchangeBlock,
  type UsedInCraft,
} from '@/lib/game/item-business'
import {
  collectGetPathLcKeys,
  collectItemLcKeys,
  resolveItemTexts,
  translateItemConfigNames,
} from '@/lib/game/item-i18n'
import type { ConsumeRefMap, ConsumeRefEntity } from '@/lib/game/load-hero-talents-bundle'
import { consumeRefKey } from '@/lib/game/load-hero-talents-bundle'
import { normalizeConsumeList } from '@/lib/game/parse-game-data'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { itemIconUrl } from '@/lib/game/resolve-item-icon'

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
  get_path?: unknown
  des_value?: unknown
}

export type ItemDetailBundle = {
  item: ItemConfigRow
  translations: Record<string, string>
  resolvedName: string
  resolvedDescHtml?: string
  craftConsume: ConsumeEntry[]
  exchangeBlocks: ExchangeBlock[]
  boxShowAwards: ReturnType<typeof buildBoxShowAwards>
  boxConsumeAwards: ConsumeEntry[]
  usedInCraft: UsedInCraft[]
  getPathLines: string[]
  consumeRefMap: ConsumeRefMap
}

const toNum = (v: unknown, fallback = 0) => {
  if (v === null || v === undefined) return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function pickRefId(entry: ConsumeEntry): string | null {
  if (entry.sid) return String(entry.sid)
  if (entry.type && entry.type !== 'prop') return String(entry.type)
  return null
}

async function loadRefEntities(ids: string[], lang: string): Promise<ConsumeRefMap> {
  const map: ConsumeRefMap = {}
  if (!ids.length) return map

  const numericIds = ids.filter((id) => /^\d+$/.test(id)).map(Number)
  const moneyTypes = ids.filter((id) => !/^\d+$/.test(id))

  const itemRows: {
    id: number
    name: string
    icon_path?: string | null
    quality?: number | null
    des_value?: unknown
  }[] = []
  if (numericIds.length) {
    const { data } = await supabase
      .from('ItemConfig')
      .select('id, name, icon_path, quality, des_value')
      .in('id', numericIds)
    itemRows.push(...((data ?? []) as typeof itemRows))
  }

  const moneyRows: { id: string; name: string; icon_path?: string | null; quality?: number | null }[] = []
  if (moneyTypes.length) {
    const { data } = await supabase
      .from('MoneyConfig')
      .select('id, name, icon_path, quality')
      .in('id', moneyTypes)
    moneyRows.push(...((data ?? []) as typeof moneyRows))
  }

  const itemNameRows = itemRows.map((r) => ({
    id: r.id,
    name: r.name,
    des_value: r.des_value,
  }))
  const moneyKeys = moneyRows.map((r) => r.name)
  const [itemNames, moneyTmap] = await Promise.all([
    translateItemConfigNames(itemNameRows, lang),
    moneyKeys.length ? translateKeys(moneyKeys, lang) : Promise.resolve({} as Record<string, string>),
  ])

  for (const r of itemRows) {
    const resolved = itemNames.get(r.id)
    const key = consumeRefKey({ type: 'prop', sid: r.id, num: 0 })
    map[key] = {
      name: resolved?.name ?? r.name,
      nameKey: resolved?.nameKey ?? r.name,
      iconUrl: itemIconUrl(r.icon_path),
      iconPath: r.icon_path,
      quality: r.quality != null ? Number(r.quality) : undefined,
    }
    map[String(r.id)] = map[key]
  }

  for (const r of moneyRows) {
    const key = consumeRefKey({ type: r.id, num: 0 })
    map[key] = {
      name: moneyTmap[r.name] || r.name,
      nameKey: r.name,
      iconUrl: itemIconUrl(r.icon_path),
      iconPath: r.icon_path,
      quality: r.quality != null ? Number(r.quality) : undefined,
    }
    map[r.id] = map[key]
  }

  return map
}

export async function loadItemDetail(
  itemId: number,
  lang: string,
  usedInCraft: UsedInCraft[] = []
): Promise<ItemDetailBundle | null> {
  const { data: row, error } = await supabase
    .from('ItemConfig')
    .select('id,name,desc,type,child_type,quality,icon_path,max_num,isRare,compose,get_path,des_value')
    .eq('id', itemId)
    .maybeSingle()

  if (error || !row) return null

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
    get_path: row.get_path ?? null,
    des_value: row.des_value ?? null,
  }

  const composeId = toNum(item.compose, 0)
  const [compositeRes, exchangeRes, boxShowRes, boxConsumeRes] = await Promise.all([
    composeId
      ? supabase.from('CompositeConfig').select('id,consume').eq('id', composeId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('ExchangeConfig').select('item_id,compose_id,decompose_id,exchange_id').eq('item_id', itemId),
    supabase.from('BoxAwardShowConfig').select('id,awards,rate_list').eq('id', itemId).maybeSingle(),
    supabase.from('BoxAwardConsumeConfig').select('id,awards').eq('id', itemId).maybeSingle(),
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
    ? normalizeConsumeList(normalizeAwardList((boxConsumeRes.data as { awards: unknown }).awards))
    : []

  const refIds = new Set<string>()
  for (const c of craftConsume) {
    const id = pickRefId(c)
    if (id) refIds.add(id)
  }
  for (const block of exchangeBlocks) {
    for (const c of [...block.consume, ...block.get]) {
      const id = pickRefId(c)
      if (id) refIds.add(id)
    }
  }
  for (const b of boxShowAwards) {
    const id = pickRefId(b.award)
    if (id) refIds.add(id)
  }
  for (const c of boxConsumeAwards) {
    const id = pickRefId(c)
    if (id) refIds.add(id)
  }
  for (const u of usedInCraft) refIds.add(String(u.targetId))

  const getPathKeys = collectGetPathLcKeys(item.get_path)
  const itemLcKeys = collectItemLcKeys([{ id: item.id, name: item.name, desc: item.desc }])
  const allKeys = [...new Set([...itemLcKeys, ...getPathKeys])]
  const translations = allKeys.length ? await translateKeys(allKeys, lang) : {}

  const { name: resolvedName, descHtml: resolvedDescHtml } = await resolveItemTexts(
    item,
    lang,
    translations
  )

  const getPathLines = getPathKeys.map((k) => translations[k] || k).filter(Boolean)

  const consumeRefMap = await loadRefEntities([...refIds], lang)

  return {
    item,
    translations,
    resolvedName,
    resolvedDescHtml,
    craftConsume: hasCraftRecipe(item.compose) ? craftConsume : [],
    exchangeBlocks,
    boxShowAwards,
    boxConsumeAwards,
    usedInCraft,
    getPathLines,
    consumeRefMap,
  }
}
