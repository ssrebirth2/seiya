import { resolveArtifactListIcon, resolveForceCardListIcon } from '@/lib/assets/game-images'
import {
  fetchHeroHeadIconEntry,
  getHeroSquareHeadUrl,
} from '@/lib/game/fetch-hero-head-icons'
import {
  figureNameKeyFromSid,
  figureObjIdFromSid,
  figureQualityFromItemQuality,
} from '@/lib/game/figure-ref'
import { parseFigureAttributePayload } from '@/lib/game/parse-figure-attribute-payload'
import { translateKeys } from '@/lib/i18n/language-package'
import { translateItemConfigNames } from '@/lib/game/item-i18n'
import {
  consumeRefKey,
  type ConsumeRefEntity,
  type ConsumeRefMap,
} from '@/lib/game/load-hero-talents-bundle'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { itemIconUrl } from '@/lib/game/resolve-item-icon'
import { supabase } from '@/lib/supabase-client'

type RefRow = {
  name: string
  nameKey: string
  iconUrl: string
  iconPath?: string | null
  quality?: number
  camp?: number
  stance?: number
  damagetype?: number
  star?: number
}

function isPropEntry(entry: ConsumeEntry): boolean {
  return !entry.type || entry.type === 'prop'
}

function isMoneyEntry(entry: ConsumeEntry): boolean {
  return Boolean(entry.type && entry.type !== 'prop' && (entry.sid == null || entry.sid <= 0))
}

async function loadItemRefs(
  entries: ConsumeEntry[],
  lang: string
): Promise<Map<number, RefRow>> {
  const numericIds = [
    ...new Set(
      entries
        .filter((e) => isPropEntry(e) && e.sid != null && e.sid > 0)
        .map((e) => e.sid!)
    ),
  ]
  const map = new Map<number, RefRow>()
  if (!numericIds.length) return map

  const { data } = await supabase
    .from('ItemConfig')
    .select('id, name, icon_path, quality, des_value')
    .in('id', numericIds)
  const rows = data ?? []
  const itemNames = await translateItemConfigNames(
    rows.map((r) => ({
      id: (r as { id: number }).id,
      name: String((r as { name: string }).name),
      des_value: (r as { des_value?: unknown }).des_value,
    })),
    lang
  )

  for (const row of rows) {
    const r = row as {
      id: number
      name: string
      icon_path?: string | null
      quality?: number | null
    }
    const resolved = itemNames.get(r.id)
    map.set(r.id, {
      name: resolved?.name ?? r.name,
      nameKey: resolved?.nameKey ?? r.name,
      iconUrl: itemIconUrl(r.icon_path),
      iconPath: r.icon_path,
      quality: r.quality != null ? Number(r.quality) : undefined,
    })
  }

  return map
}

async function loadMoneyRefs(
  entries: ConsumeEntry[],
  lang: string
): Promise<Map<string, RefRow>> {
  const moneyTypes = [
    ...new Set(entries.filter(isMoneyEntry).map((e) => e.type!)),
  ]
  const map = new Map<string, RefRow>()
  if (!moneyTypes.length) return map

  const { data } = await supabase
    .from('MoneyConfig')
    .select('id, name, icon_path, quality')
    .in('id', moneyTypes)
  const rows = data ?? []
  const tmap = await translateKeys(rows.map((r) => String((r as { name: string }).name)), lang)

  for (const row of rows) {
    const r = row as { id: string; name: string; icon_path?: string | null; quality?: number | null }
    map.set(r.id, {
      name: tmap[r.name] || r.name,
      nameKey: r.name,
      iconUrl: itemIconUrl(r.icon_path),
      iconPath: r.icon_path,
      quality: r.quality != null ? Number(r.quality) : undefined,
    })
  }

  return map
}

async function loadArtifactRefs(
  entries: ConsumeEntry[],
  lang: string
): Promise<Map<number, RefRow>> {
  const artifactIds = [
    ...new Set(
      entries
        .filter((e) => e.type === 'artifact' && e.sid != null && e.sid > 0)
        .map((e) => e.sid!)
    ),
  ]
  const map = new Map<number, RefRow>()
  if (!artifactIds.length) return map

  const [{ data: arts }, { data: res }] = await Promise.all([
    supabase.from('ArtifactConfig').select('id, name, initial_quality').in('id', artifactIds),
    supabase.from('ArtifactResourcesConfig').select('id, item_icon').in('id', artifactIds),
  ])

  const itemIconById = new Map<number, string | null | undefined>()
  for (const row of res ?? []) {
    itemIconById.set((row as { id: number }).id, (row as { item_icon?: string | null }).item_icon)
  }

  const nameKeys = (arts ?? []).map((a) => String((a as { name: string }).name))
  const tmap = nameKeys.length ? await translateKeys(nameKeys, lang) : {}

  for (const row of arts ?? []) {
    const art = row as { id: number; name: string; initial_quality?: number | null }
    const itemIcon = itemIconById.get(art.id)
    const { src, rawSrc } = resolveArtifactListIcon(itemIcon)
    const quality =
      typeof art.initial_quality === 'number' ? art.initial_quality : undefined

    map.set(art.id, {
      name: tmap[art.name] || art.name,
      nameKey: art.name,
      iconUrl: rawSrc ? src : itemIconUrl(null),
      iconPath: itemIcon,
      quality,
    })
  }

  return map
}

function isForceCardEntry(entry: ConsumeEntry): boolean {
  return entry.type === 'force_card' || entry.type === 'dynamis'
}

async function loadForceCardRefs(
  entries: ConsumeEntry[],
  lang: string
): Promise<Map<number, RefRow>> {
  const cardIds = [
    ...new Set(
      entries
        .filter((e) => isForceCardEntry(e) && e.sid != null && e.sid > 0)
        .map((e) => e.sid!)
    ),
  ]
  const map = new Map<number, RefRow>()
  if (!cardIds.length) return map

  const { data } = await supabase
    .from('ForceCardItemConfig')
    .select('id, name, quality, icon_samll_path')
    .in('id', cardIds)

  const nameKeys = (data ?? []).map((r) => String((r as { name: string }).name))
  const tmap = nameKeys.length ? await translateKeys(nameKeys, lang) : {}

  for (const row of data ?? []) {
    const card = row as {
      id: number
      name: string
      quality?: number | null
      icon_samll_path?: string | null
    }
    const hasIcon = Boolean(card.icon_samll_path)
    const { src, rawSrc } = resolveForceCardListIcon(card.id, hasIcon)

    map.set(card.id, {
      name: tmap[card.name] || card.name,
      nameKey: card.name,
      iconUrl: rawSrc ? src : itemIconUrl(null),
      iconPath: card.icon_samll_path,
      quality: card.quality != null ? Number(card.quality) : undefined,
    })
  }

  return map
}

async function loadFigureRefs(
  entries: ConsumeEntry[],
  lang: string
): Promise<Map<number, RefRow>> {
  const figureIds = [
    ...new Set(
      entries
        .filter((e) => e.type === 'figure' && e.sid != null && e.sid > 0)
        .map((e) => e.sid!)
    ),
  ]
  const map = new Map<number, RefRow>()
  if (!figureIds.length) return map

  const { data, error } = await supabase
    .from('FigureAttributeConfig')
    .select('id, payload')
    .in(
      'id',
      figureIds.map((id) => String(id))
    )

  const foundIds = new Set<number>()

  if (!error && data?.length) {
    const parsed = data.map((row) =>
      parseFigureAttributePayload(
        (row as { payload: unknown }).payload,
        Number((row as { id: string | number }).id)
      )
    )
    const nameKeys = parsed.map((r) => r.name).filter((k): k is string => Boolean(k))
    const tmap = nameKeys.length ? await translateKeys(nameKeys, lang) : {}

    for (const fig of parsed) {
      if (!fig.id) continue
      foundIds.add(fig.id)
      const nameKey = fig.name || figureNameKeyFromSid(fig.id)
      map.set(fig.id, {
        name: (fig.name && tmap[fig.name]) || nameKey,
        nameKey,
        iconUrl: itemIconUrl(fig.iconPath),
        iconPath: fig.iconPath,
        quality: fig.figureInitialQuality ?? undefined,
      })
    }
  }

  const missingIds = figureIds.filter((id) => !foundIds.has(id))
  if (!missingIds.length) return map

  const objIds = [
    ...new Set(
      missingIds
        .map((id) => figureObjIdFromSid(id))
        .filter((id): id is number => id != null)
    ),
  ]

  const itemByObjId = new Map<number, { icon_path?: string | null; quality?: number | null }>()
  if (objIds.length) {
    const { data: items } = await supabase
      .from('ItemConfig')
      .select('id, icon_path, quality')
      .in('id', objIds)
    for (const row of items ?? []) {
      const item = row as { id: number; icon_path?: string | null; quality?: number | null }
      itemByObjId.set(item.id, item)
    }
  }

  const nameKeys = missingIds.map((id) => figureNameKeyFromSid(id))
  const tmap = nameKeys.length ? await translateKeys(nameKeys, lang) : {}

  for (const figureId of missingIds) {
    const objId = figureObjIdFromSid(figureId)
    const item = objId != null ? itemByObjId.get(objId) : undefined
    const nameKey = figureNameKeyFromSid(figureId)

    map.set(figureId, {
      name: tmap[nameKey] || nameKey,
      nameKey,
      iconUrl: itemIconUrl(item?.icon_path),
      iconPath: item?.icon_path,
      quality: figureQualityFromItemQuality(item?.quality),
    })
  }

  return map
}

async function loadHeroRefs(
  entries: ConsumeEntry[],
  lang: string
): Promise<Map<number, RefRow>> {
  const heroIds = [
    ...new Set(
      entries
        .filter((e) => e.type === 'hero' && e.sid != null && e.sid > 0)
        .map((e) => e.sid!)
    ),
  ]
  const map = new Map<number, RefRow>()
  if (!heroIds.length) return map

  const resourceIds = heroIds.map((id) => id * 10)
  const [{ data: roles }, { data: resources }] = await Promise.all([
    supabase.from('RoleConfig').select('id, camp, stance, damagetype, quality, star').in('id', heroIds),
    supabase.from('RoleResourcesConfig').select('id, role_name').in('id', resourceIds),
  ])

  const nameKeyByHeroId = new Map<number, string>()
  for (const row of resources ?? []) {
    const resource = row as { id: number; role_name?: string | null }
    const heroId = Math.floor(resource.id / 10)
    if (resource.role_name) nameKeyByHeroId.set(heroId, String(resource.role_name))
  }

  const nameKeys = [...new Set(nameKeyByHeroId.values())]
  const tmap = nameKeys.length ? await translateKeys(nameKeys, lang) : {}
  const iconEntries = await Promise.all(heroIds.map((id) => fetchHeroHeadIconEntry(id)))

  for (let i = 0; i < heroIds.length; i++) {
    const heroId = heroIds[i]
    const role = (roles ?? []).find((r) => Number((r as { id: number }).id) === heroId) as
      | {
          id: number
          camp: number
          stance: number
          damagetype: number
          quality?: number | null
          star?: number | null
        }
      | undefined
    const nameKey = nameKeyByHeroId.get(heroId) ?? `LC_ROLE_role_full_name_${heroId}`
    const iconEntry = iconEntries[i]
    const iconMap = iconEntry ? { [heroId]: iconEntry } : undefined

    map.set(heroId, {
      name: tmap[nameKey] || nameKey,
      nameKey,
      iconUrl: getHeroSquareHeadUrl(iconMap, heroId),
      iconPath: iconEntry?.squarePath,
      quality: role?.quality != null ? Number(role.quality) : undefined,
      camp: role?.camp != null ? Number(role.camp) : 0,
      stance: role?.stance != null ? Number(role.stance) : 0,
      damagetype: role?.damagetype != null ? Number(role.damagetype) : 0,
      star: role?.star != null ? Number(role.star) : undefined,
    })
  }

  return map
}

function fallbackEntity(entry: ConsumeEntry): ConsumeRefEntity {
  return {
    name: entry.sid ? `#${entry.sid}` : entry.type || 'Unknown',
    nameKey: entry.type ?? String(entry.sid ?? 'unknown'),
    iconUrl: itemIconUrl(null),
  }
}

function toEntity(ref: RefRow | undefined, entry: ConsumeEntry): ConsumeRefEntity {
  if (!ref) return fallbackEntity(entry)
  const entity: ConsumeRefEntity = {
    name: ref.name,
    nameKey: ref.nameKey,
    iconUrl: ref.iconUrl,
    iconPath: ref.iconPath,
    quality: ref.quality,
  }
  if (
    entry.type === 'hero' &&
    ref.camp != null &&
    ref.stance != null &&
    ref.damagetype != null
  ) {
    entity.heroMeta = {
      camp: ref.camp,
      stance: ref.stance,
      damagetype: ref.damagetype,
      star: entry.star && entry.star > 0 ? entry.star : ref.star,
    }
  }
  return entity
}

/** Resolve consume entries to icon/name/quality refs (items, money, artifacts, …). */
export async function loadConsumeRefMap(
  entries: ConsumeEntry[],
  lang: string
): Promise<ConsumeRefMap> {
  const map: ConsumeRefMap = {}
  if (!entries.length) return map

  const uniqueEntries = [...new Map(entries.map((entry) => [consumeRefKey(entry), entry])).values()]

  const [itemById, moneyById, artifactById, forceCardById, figureById, heroById] = await Promise.all([
    loadItemRefs(uniqueEntries, lang),
    loadMoneyRefs(uniqueEntries, lang),
    loadArtifactRefs(uniqueEntries, lang),
    loadForceCardRefs(uniqueEntries, lang),
    loadFigureRefs(uniqueEntries, lang),
    loadHeroRefs(uniqueEntries, lang),
  ])

  for (const entry of uniqueEntries) {
    const key = consumeRefKey(entry)
    if (map[key]) continue

    if (entry.type === 'artifact' && entry.sid) {
      map[key] = toEntity(artifactById.get(entry.sid), entry)
      continue
    }

    if (isForceCardEntry(entry) && entry.sid) {
      map[key] = toEntity(forceCardById.get(entry.sid), entry)
      continue
    }

    if (entry.type === 'figure' && entry.sid) {
      map[key] = toEntity(figureById.get(entry.sid), entry)
      continue
    }

    if (entry.type === 'hero' && entry.sid) {
      map[key] = toEntity(heroById.get(entry.sid), entry)
      continue
    }

    if (isPropEntry(entry) && entry.sid) {
      map[key] = toEntity(itemById.get(entry.sid), entry)
      map[String(entry.sid)] = map[key]
      continue
    }

    if (entry.type && moneyById.has(entry.type)) {
      map[key] = toEntity(moneyById.get(entry.type), entry)
      map[entry.type] = map[key]
      continue
    }

    map[key] = fallbackEntity(entry)
  }

  return map
}
