import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { itemIconUrl } from '@/lib/game/resolve-item-icon'
import { supabase } from '@/lib/supabase-client'
import { translateKeys, NOT_AVAILABLE_LABEL, isMissingLcTranslation } from '@/lib/i18n/language-package'
import { translateItemConfigNames } from '@/lib/game/item-i18n'
import type { HeroTalentsData } from '@/lib/game/talent-types'
import { loadHeroTalents } from '@/lib/game/load-hero-talents'
import { skillTypeLcKey } from '@/lib/game/format-skill-labels'
import {
  normalizeDesValueList,
  parsePrimitiveList,
} from '@/lib/game/parse-game-data'
import { loadSkillValues } from '@/lib/game/apply-skill-values'

export interface ConsumeRefEntity {
  name: string
  nameKey: string
  iconUrl: string
  iconPath?: string | null
  quality?: number
}

export type ConsumeRefMap = Record<string, ConsumeRefEntity>

export interface HeroTalentsBundle {
  data: HeroTalentsData
  translations: Record<string, string>
  valuesMap: Record<number, (string | number)[]>
  labelMap: Record<number, string>
  consumeRefMap: ConsumeRefMap
}

export function consumeRefKey(item: ConsumeEntry): string {
  return `${item.type ?? 'prop'}:${item.sid ?? 0}`
}

function collectAllConsumes(data: HeroTalentsData): ConsumeEntry[] {
  const out: ConsumeEntry[] = []
  for (const layer of data.layers) {
    for (const c of layer.layerSkill.consume) out.push(c)
    for (const c of layer.layerSkill.heroConsume) out.push(c)
    for (const point of layer.points) {
      for (const level of point.levels) {
        for (const c of level.consume) out.push(c)
      }
    }
  }
  return out
}

async function loadConsumeRefMap(
  items: ConsumeEntry[],
  lang: string
): Promise<ConsumeRefMap> {
  const map: ConsumeRefMap = {}
  if (!items.length) return map

  const numericIds = [
    ...new Set(items.map((i) => i.sid).filter((id): id is number => id != null && id > 0)),
  ]
  const moneyTypes = [
    ...new Set(items.filter((i) => i.type && i.type !== 'prop').map((i) => i.type!)),
  ]

  const itemById = new Map<
    number,
    { name: string; nameKey: string; icon_path?: string | null; quality?: number | null }
  >()
  if (numericIds.length) {
    const { data } = await supabase
      .from('ItemConfig')
      .select('id, name, icon_path, quality, des_value')
      .in('id', numericIds)
    const rows = data || []
    const itemNames = await translateItemConfigNames(
      rows.map((r) => ({
        id: (r as { id: number }).id,
        name: String((r as { name: string }).name),
        des_value: (r as { des_value?: unknown }).des_value,
      })),
      lang
    )
    for (const row of rows) {
      const r = row as { id: number; name: string; icon_path?: string | null; quality?: number | null }
      const resolved = itemNames.get(r.id)
      itemById.set(r.id, {
        name: resolved?.name ?? r.name,
        nameKey: resolved?.nameKey ?? r.name,
        icon_path: r.icon_path,
        quality: r.quality != null ? Number(r.quality) : undefined,
      })
    }
  }

  const moneyById = new Map<
    string,
    { name: string; nameKey: string; icon_path?: string | null; quality?: number | null }
  >()
  if (moneyTypes.length) {
    const { data } = await supabase
      .from('MoneyConfig')
      .select('id, name, icon_path, quality')
      .in('id', moneyTypes)
    const rows = data || []
    const tmap = await translateKeys(rows.map((r) => String((r as { name: string }).name)), lang)
    for (const row of rows) {
      const r = row as { id: string; name: string; icon_path?: string | null; quality?: number | null }
      moneyById.set(r.id, {
        name: tmap[r.name] || r.name,
        nameKey: r.name,
        icon_path: r.icon_path,
        quality: r.quality != null ? Number(r.quality) : undefined,
      })
    }
  }

  for (const item of items) {
    const key = consumeRefKey(item)
    if (map[key]) continue

    if (item.type === 'prop' && item.sid) {
      const ref = itemById.get(item.sid)
      map[key] = {
        name: ref?.name ?? `#${item.sid}`,
        nameKey: ref?.nameKey ?? String(item.sid),
        iconUrl: itemIconUrl(ref?.icon_path),
        iconPath: ref?.icon_path,
        quality: ref?.quality ?? undefined,
      }
      continue
    }

    if (item.type && moneyById.has(item.type)) {
      const ref = moneyById.get(item.type)!
      map[key] = {
        name: ref.name,
        nameKey: ref.nameKey,
        iconUrl: itemIconUrl(ref.icon_path),
        iconPath: ref.icon_path,
        quality: ref?.quality ?? undefined,
      }
      continue
    }

    map[key] = {
      name: item.sid ? `#${item.sid}` : item.type || 'Unknown',
      nameKey: item.type ?? String(item.sid ?? 'unknown'),
      iconUrl: itemIconUrl(null),
      quality: undefined,
    }
  }

  return map
}

export async function loadHeroTalentsBundle(
  heroId: number,
  lang: string
): Promise<HeroTalentsBundle | null> {
  const data = await loadHeroTalents(heroId)
  if (!data) return null

  const tkeys = new Set<string>()
  const valueIds = new Set<number>()
  const labelIds = new Set<number>()

  tkeys.add('LC_hero_giftness_tag')
  data.visibleStats.forEach((s) => tkeys.add(s))

  for (const layer of data.layers) {
    layer.unlock.forEach((u) => {
      if (u.desc) tkeys.add(u.desc)
    })
    for (const point of layer.points) {
      for (const level of point.levels) {
        level.attributes.forEach((a) => tkeys.add(a.stat))
      }
    }
    if (layer.layerSkill.skillRow) {
      const skillRow = layer.layerSkill.skillRow
      if (skillRow.name) tkeys.add(String(skillRow.name))
      if (skillRow.skill_type) {
        const typeKey = skillTypeLcKey(skillRow.skill_type)
        if (typeKey) tkeys.add(typeKey)
      }
      parsePrimitiveList(skillRow.label_list).forEach((id) => labelIds.add(Number(id)))
      normalizeDesValueList(skillRow.skill_des).forEach((d) => {
        if (d.des) tkeys.add(d.des)
        if (d.value != null) valueIds.add(Number(d.value))
      })
    }
  }

  let labelRecords: { id: number; name: string }[] = []
  if (labelIds.size) {
    const { data: labels } = await supabase
      .from('SkillLabelConfig')
      .select('id, name')
      .in('id', Array.from(labelIds))
    labelRecords = (labels || []) as { id: number; name: string }[]
    labelRecords.forEach((l) => tkeys.add(l.name))
  }

  const [translations, valuesMap, consumeRefMap] = await Promise.all([
    translateKeys(Array.from(tkeys), lang),
    loadSkillValues(Array.from(valueIds)),
    loadConsumeRefMap(collectAllConsumes(data), lang),
  ])

  const labelMap: Record<number, string> = {}
  labelRecords.forEach((l) => {
    const resolved = translations[l.name]
    labelMap[l.id] =
      isMissingLcTranslation(l.name, resolved) ? NOT_AVAILABLE_LABEL : (resolved ?? l.name)
  })

  return { data, translations, valuesMap, labelMap, consumeRefMap }
}
