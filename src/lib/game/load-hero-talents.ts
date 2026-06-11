import { supabase } from '@/lib/supabase-client'
import {
  normalizeConsumeList,
  normalizeSkillRef,
  parseGameData,
  parsePrimitiveList,
} from '@/lib/game/parse-game-data'
import type {
  HeroTalentsData,
  TalentAttributeEntry,
  TalentLayerData,
  TalentLayerSkill,
  TalentLevelRow,
  TalentPointData,
  TalentUnlockEntry,
} from '@/lib/game/talent-types'

function parseUnlock(raw: unknown): TalentUnlockEntry[] {
  return parseGameData(raw).flatMap((item) => {
    if (Array.isArray(item) && item.length >= 4) {
      return [
        {
          desc: String(item[0] ?? ''),
          object_id: item[1] != null ? Number(item[1]) : null,
          type: String(item[2] ?? ''),
          value: Number(item[3]),
        },
      ]
    }
    if (item && typeof item === 'object' && 'desc' in item) {
      const o = item as Record<string, unknown>
      return [
        {
          desc: String(o.desc ?? ''),
          object_id: o.object_id != null ? Number(o.object_id) : null,
          type: String(o.type ?? ''),
          value: o.value != null ? Number(o.value) : undefined,
        },
      ]
    }
    return []
  })
}

function parseAttributes(raw: unknown): TalentAttributeEntry[] {
  return parseGameData(raw).flatMap((item) => {
    if (Array.isArray(item) && item.length >= 3) {
      return [
        {
          stat: String(item[0]),
          isPercent: Number(item[1]),
          value: Number(item[2]),
        },
      ]
    }
    return []
  })
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function fetchByIds(
  table: string,
  ids: number[]
): Promise<Map<number, Record<string, unknown>>> {
  const map = new Map<number, Record<string, unknown>>()
  const unique = [...new Set(ids.filter((id) => id > 0))]
  if (!unique.length) return map

  for (const part of chunk(unique, 500)) {
    const { data } = await supabase.from(table).select('*').in('id', part)
    for (const row of data || []) {
      const r = row as Record<string, unknown> & { id: number }
      map.set(r.id, r)
    }
  }
  return map
}

async function fetchSkillsByIds(ids: number[]): Promise<Map<number, Record<string, unknown>>> {
  const map = new Map<number, Record<string, unknown>>()
  const unique = [...new Set(ids.filter((id) => id > 0))]
  if (!unique.length) return map

  for (const part of chunk(unique, 500)) {
    const { data } = await supabase.from('SkillConfig').select('*').in('skillid', part)
    for (const row of data || []) {
      map.set(Number((row as { skillid: number }).skillid), row as Record<string, unknown>)
    }
  }
  return map
}

export async function loadHeroTalents(heroId: number): Promise<HeroTalentsData | null> {
  const { data: heroCfg } = await supabase
    .from('HeroTalentConfig')
    .select('*')
    .eq('id', heroId)
    .maybeSingle()

  if (!heroCfg) return null

  const talentLayerIds = parsePrimitiveList(heroCfg.talent_layers).map(Number)
  const skillLayerIds = parsePrimitiveList(heroCfg.skill_layers).map(Number)
  if (!talentLayerIds.length) return null

  const [layerMap, skillCfgMap, attrIndexRow] = await Promise.all([
    fetchByIds('HeroTalentLayersConfig', talentLayerIds),
    fetchByIds('HeroTalentSkillConfig', skillLayerIds),
    supabase.from('AttributesIndexConfig').select('atr').eq('id', 1).maybeSingle(),
  ])

  const attributeIds: number[] = []
  for (const layerId of talentLayerIds) {
    const layer = layerMap.get(layerId)
    if (layer) parsePrimitiveList(layer.attribute_id).forEach((id) => attributeIds.push(Number(id)))
  }

  const attrMap = await fetchByIds('HeroTalentAttributeConfig', attributeIds)

  const levelIds: number[] = []
  for (const attrId of attributeIds) {
    const attr = attrMap.get(attrId)
    if (attr) parsePrimitiveList(attr.attribute_level_id).forEach((id) => levelIds.push(Number(id)))
  }

  const levelMap = await fetchByIds('HeroTalentAttributeLevelConfig', levelIds)

  const skillIds: number[] = []
  for (const skillCfgId of skillLayerIds) {
    const sc = skillCfgMap.get(skillCfgId)
    if (!sc) continue
    const show = normalizeSkillRef(sc.showskill)
    if (show?.skill_id) skillIds.push(show.skill_id)
  }

  const skillRows = await fetchSkillsByIds(skillIds)

  const layers: TalentLayerData[] = talentLayerIds.map((layerId, index) => {
    const layer = layerMap.get(layerId) || {}
    const pointIds = parsePrimitiveList(layer.attribute_id).map(Number)

    const points: TalentPointData[] = pointIds.map((pointId, pointIndex) => {
      const attrCfg = attrMap.get(pointId)
      const levelIdList = attrCfg ? parsePrimitiveList(attrCfg.attribute_level_id).map(Number) : []

      const levels: TalentLevelRow[] = levelIdList.map((levelId, levelIndex) => {
        const levelCfg = levelMap.get(levelId) || {}
        return {
          id: levelId,
          level: levelIndex + 1,
          attributes: parseAttributes(levelCfg.attribute),
          consume: normalizeConsumeList(levelCfg.consume),
        }
      })

      return { id: pointId, index: pointIndex + 1, levels }
    })

    const skillCfgId = skillLayerIds[index]
    const sc = skillCfgMap.get(skillCfgId) || {}
    const showRef = normalizeSkillRef(sc.showskill)
    const realRef = normalizeSkillRef(sc.skill)

    const layerSkill: TalentLayerSkill = {
      configId: skillCfgId,
      showSkillId: showRef?.skill_id ?? null,
      realSkillId: realRef?.skill_id ?? null,
      showSkillLv: showRef?.skill_lv,
      realSkillLv: realRef?.skill_lv,
      consume: normalizeConsumeList(sc.consume),
      heroConsume: normalizeConsumeList(sc.hero_consume),
      generalItem: sc.general_item != null ? Number(sc.general_item) : null,
      skillRow: showRef?.skill_id ? skillRows.get(showRef.skill_id) ?? null : null,
    }

    return {
      index: index + 1,
      layerId,
      maxLevel: Number(layer.max_level) || 5,
      unlock: parseUnlock(layer.unlock),
      points,
      layerSkill,
    }
  })

  const visibleStats = parseGameData(attrIndexRow.data?.atr).map(String)

  return { heroId, layers, visibleStats }
}
