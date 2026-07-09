import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import type { HeroTalentsData } from '@/lib/game/talent-types'
import { loadHeroTalents } from '@/lib/game/load-hero-talents'
import { loadConsumeRefMap as loadConsumeRefMapCore } from '@/lib/game/load-consume-ref-map'
import { translateKeys, NOT_AVAILABLE_LABEL, isMissingLcTranslation } from '@/lib/i18n/language-package'
import { supabase } from '@/lib/supabase-client'
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
  /** Hero box awards — UISquareHeroItem fields from RoleConfig */
  heroMeta?: {
    camp: number
    stance: number
    damagetype: number
    star?: number
  }
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
  return loadConsumeRefMapCore(items, lang)
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
