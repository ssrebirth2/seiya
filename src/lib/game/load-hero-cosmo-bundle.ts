import { loadSkillValues } from '@/lib/game/apply-skill-values'
import { aggregateConsume } from '@/lib/game/aggregate-consume'
import type { HeroCosmoBundle } from '@/lib/game/cosmo-types'
import { loadHeroCosmo } from '@/lib/game/load-hero-cosmo'
import { loadConsumeRefMap } from '@/lib/game/load-consume-ref-map'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import {
  normalizeDesValueList,
  parsePrimitiveList,
  type ConsumeEntry,
} from '@/lib/game/parse-game-data'
import { skillTypeLcKey } from '@/lib/game/format-skill-labels'
import { UI_KEYS } from '@/lib/i18n/ui-keys'
import { NOT_AVAILABLE_LABEL, isMissingLcTranslation, translateKeys } from '@/lib/i18n/language-package'
import { supabase } from '@/lib/supabase-client'

function collectConsumes(data: NonNullable<Awaited<ReturnType<typeof loadHeroCosmo>>>): ConsumeEntry[] {
  return data.senses.flatMap((sense) => sense.points.flatMap((p) => p.consume))
}

export async function loadHeroCosmoBundle(heroId: number, lang: string): Promise<HeroCosmoBundle | null> {
  const data = await loadHeroCosmo(heroId)
  if (!data) return null

  const tkeys = new Set<string>()
  const valueIds = new Set<number>()
  const labelIds = new Set<number>()
  const skillIds = [...new Set(data.passives.map((p) => p.skillId))]

  tkeys.add(UI_KEYS.hero.cosmoTab)
  tkeys.add(UI_KEYS.hero.cosmoTitle)
  tkeys.add(UI_KEYS.hero.cosmoPassives)
  tkeys.add(UI_KEYS.hero.cosmoProgression)
  tkeys.add(UI_KEYS.hero.cosmoSenseUnlock)
  tkeys.add(UI_KEYS.hero.cosmoTotalCost)
  tkeys.add(UI_KEYS.hero.cosmoStatsAccumulated)
  tkeys.add(UI_KEYS.hero.cosmoAttFormat)
  tkeys.add(UI_KEYS.hero.cosmoUv)
  tkeys.add(UI_KEYS.hero.cosmoTotalUv)
  tkeys.add(UI_KEYS.hero.cosmoSenseValue)
  tkeys.add(UI_KEYS.hero.cosmoHeroLevel)
  tkeys.add(UI_KEYS.hero.cosmoPrepointInactive)
  tkeys.add(UI_KEYS.hero.cosmoSenseLockedTip)
  tkeys.add(UI_KEYS.hero.cosmoUnlockDomain)
  tkeys.add(UI_KEYS.hero.constellation)
  tkeys.add(UI_KEYS.common.noData)
  tkeys.add(UI_KEYS.common.detail)
  tkeys.add(UI_KEYS.common.unlockCondition)
  tkeys.add('LC_COSMO_sense_total_value_with_replacement')

  data.senseLabelKeys.forEach((k) => tkeys.add(k))
  if (data.constellationNameKey) tkeys.add(data.constellationNameKey)
  if (data.heroNameKey) tkeys.add(data.heroNameKey)
  tkeys.add(data.galleryNameKey)

  for (const sense of data.senses) {
    sense.unlock.forEach((u) => {
      if (u.desc) tkeys.add(u.desc)
    })
    for (const point of sense.points) {
      point.attributes.forEach((a) => tkeys.add(a.statKey))
    }
  }
  data.unlock.forEach((u) => {
    if (u.desc) tkeys.add(u.desc)
  })

  let skillRows: Record<number, Record<string, unknown>> = {}
  if (skillIds.length) {
    const { data: skills } = await supabase.from('SkillConfig').select('*').in('skillid', skillIds)
    for (const row of skills || []) {
      const skill = row as Record<string, unknown> & { skillid: number }
      skillRows[skill.skillid] = skill
      if (skill.name) tkeys.add(String(skill.name))
      if (skill.skill_type) {
        const typeKey = skillTypeLcKey(skill.skill_type)
        if (typeKey) tkeys.add(typeKey)
      }
      parsePrimitiveList(skill.label_list).forEach((id) => labelIds.add(Number(id)))
      normalizeDesValueList(skill.skill_des).forEach((d) => {
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

  const consumes = aggregateConsume(collectConsumes(data))
  const [translations, valuesMap, consumeRefMap] = await Promise.all([
    translateKeys(Array.from(tkeys), lang),
    loadSkillValues(Array.from(valueIds)),
    loadConsumeRefMap(consumes, lang),
  ])

  const labelMap: Record<number, string> = {}
  labelRecords.forEach((l) => {
    const resolved = translations[l.name]
    labelMap[l.id] =
      isMissingLcTranslation(l.name, resolved) ? NOT_AVAILABLE_LABEL : (resolved ?? l.name)
  })

  return {
    data,
    translations,
    valuesMap,
    labelMap,
    consumeRefMap: consumeRefMap as ConsumeRefMap,
    skillMap: skillRows,
  }
}
