import { supabase } from '@/lib/supabase-client'
import {
  extractSkillIdFromInfo,
  normalizeSkillRefList,
  parseGameData,
  parsePrimitiveList,
} from '@/lib/game/parse-game-data'

export type HeroProfileSkillEntry = {
  skillId: string
  sortKey: number
  isQuality: boolean
  isAwaken: boolean
}

/**
 * Mirrors HeroDetailInfoView:ShowSkill + HeroUtil.GetAwakeAndQualitySkill sort.
 * Order: base skills 1–6 by sid, then quality, then awaken.
 */
export function sortHeroProfileSkills(
  entries: HeroProfileSkillEntry[]
): HeroProfileSkillEntry[] {
  return [...entries].sort((a, b) => {
    if (
      (a.isAwaken && b.isQuality) ||
      (b.isAwaken && a.isQuality)
    ) {
      return a.isQuality ? -1 : 1
    }
    return a.sortKey - b.sortKey
  })
}

export async function loadHeroProfileSkillEntries(
  heroId: number,
  baseSkillIds: (number | string)[]
): Promise<HeroProfileSkillEntry[]> {
  const entries: HeroProfileSkillEntry[] = baseSkillIds.map((id) => ({
    skillId: String(id),
    sortKey: Number(id),
    isQuality: false,
    isAwaken: false,
  }))

  const { data: heroRow } = await supabase
    .from('HeroConfig')
    .select('hero_quality_skill_ids')
    .eq('id', heroId)
    .maybeSingle()

  if (heroRow?.hero_quality_skill_ids?.length) {
    const qualityIds = heroRow.hero_quality_skill_ids as number[]
    const { data: qualityRows } = await supabase
      .from('HeroQualitySkillConfig')
      .select('*')
      .in('id', qualityIds)

    if (qualityRows?.length) {
      const lastInfo = qualityRows[qualityRows.length - 1].skill_info
      const qualitySkillId = extractSkillIdFromInfo(lastInfo)
      if (qualitySkillId) {
        entries.push({
          skillId: String(qualitySkillId),
          sortKey: Number(qualitySkillId),
          isQuality: true,
          isAwaken: false,
        })
      }
    }
  }

  const { data: awakenCfg } = await supabase
    .from('HeroAwakenConfig')
    .select('awaken_list')
    .eq('id', heroId)
    .maybeSingle()

  if (awakenCfg?.awaken_list) {
    const awakenIds = parseGameData(awakenCfg.awaken_list) as number[]
    if (awakenIds.length) {
      const { data: awakenInfos } = await supabase
        .from('HeroAwakenInfoConfig')
        .select('add_skill')
        .in('id', awakenIds)

      for (const info of awakenInfos ?? []) {
        const refs = normalizeSkillRefList(info.add_skill)
        const first = refs.find((r) => r.skill_id)
        if (first?.skill_id) {
          entries.push({
            skillId: String(first.skill_id),
            sortKey: Number(first.skill_id),
            isQuality: false,
            isAwaken: true,
          })
          break
        }
      }
    }
  }

  return sortHeroProfileSkills(entries)
}

/** Fetch SkillConfig rows for profile entries (includes sub-skills). */
export async function loadHeroProfileSkillMap(
  entries: HeroProfileSkillEntry[]
): Promise<Map<string, Record<string, unknown>>> {
  const rootIds = entries.map((e) => e.skillId)
  if (!rootIds.length) return new Map()

  const { data: roots } = await supabase.from('SkillConfig').select('*').in('skillid', rootIds)
  if (!roots?.length) return new Map()

  const subIds = new Set<string>()
  roots.forEach((r) => parsePrimitiveList(r.sub_skills).forEach((sid) => subIds.add(String(sid))))

  let subs: Record<string, unknown>[] = []
  if (subIds.size > 0) {
    const { data: subData } = await supabase
      .from('SkillConfig')
      .select('*')
      .in('skillid', Array.from(subIds))
    subs = subData || []
  }

  return new Map([...roots, ...subs].map((s) => [String(s.skillid), s]))
}
