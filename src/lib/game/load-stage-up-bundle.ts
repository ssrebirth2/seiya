import { supabase } from '@/lib/supabase-client'
import { isHeroListed } from '@/lib/game/hidden-hero-ids'
import { loadConsumeRefMap } from '@/lib/game/load-consume-ref-map'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { parsePrimitiveList } from '@/lib/game/parse-game-data'
import {
  parseHeroQualityConsumePayload,
  parseHeroStageConsumePayload,
  parseMinQualityFromConditionPayload,
  parseNumberListField,
} from '@/lib/game/parse-hero-stage-payload'
import type {
  StageConsumeLookup,
  StageUpHeroData,
  StageUpLadders,
} from '@/lib/game/compute-stage-plan'

export type StageUpCatalogHero = {
  id: number
  camp: number
  stance: number
  damagetype: number
  occupation: number
  quality: number
  stage: number
}

export type StageUpHeroBundle = StageUpHeroData & {
  ladders: StageUpLadders
  consumeRefMap: ConsumeRefMap
}

function toNumberList(val: unknown): number[] {
  if (Array.isArray(val)) {
    return val.map(Number).filter((n) => Number.isFinite(n))
  }
  return parsePrimitiveList(val).map(Number).filter((n) => Number.isFinite(n))
}

async function fetchPayloadRows(table: string, ids?: number[]): Promise<Map<number, unknown>> {
  const map = new Map<number, unknown>()
  if (ids && ids.length === 0) return map

  if (!ids) {
    const { data, error } = await supabase.from(table).select('id, payload')
    if (error) throw error
    for (const row of data ?? []) {
      map.set(Number(row.id), row.payload)
    }
    return map
  }

  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const { data, error } = await supabase.from(table).select('id, payload').in('id', chunk)
    if (error) throw error
    for (const row of data ?? []) {
      map.set(Number(row.id), row.payload)
    }
  }
  return map
}

function lookupFromPayloads(
  payloads: Map<number, unknown>,
  ids: number[],
  parse: (payload: unknown, id: number) => { consume: StageConsumeLookup['consume']; consumeCurrency: StageConsumeLookup['consumeCurrency'] }
): Record<number, StageConsumeLookup> {
  const out: Record<number, StageConsumeLookup> = {}
  for (const id of ids) {
    const payload = payloads.get(id)
    if (payload == null) continue
    const step = parse(payload, id)
    out[id] = { consume: step.consume, consumeCurrency: step.consumeCurrency }
  }
  return out
}

export async function loadStageUpLadders(): Promise<StageUpLadders> {
  const [levelRows, conditionRows, qualityStageRows, qualityLevelRows] = await Promise.all([
    fetchPayloadRows('HeroStageLevelConfig'),
    fetchPayloadRows('HeroStageConditionConfig'),
    fetchPayloadRows('HeroQualityStageConfig'),
    fetchPayloadRows('HeroQualityLevelConfig'),
  ])

  const levelPayload = levelRows.get(1)
  const stageMaxLevels = levelPayload != null ? parseNumberListField(levelPayload, 2) : []

  const minQualityToLeave: number[] = []
  const conditionIds = [...conditionRows.keys()].sort((a, b) => a - b)
  const maxConditionId = conditionIds.at(-1) ?? -1
  for (let stage = 0; stage <= maxConditionId; stage++) {
    const payload = conditionRows.get(stage)
    const minQuality = payload != null ? parseMinQualityFromConditionPayload(payload) : null
    minQualityToLeave[stage] = minQuality ?? 1
  }

  const qualityStagePayload =
    qualityStageRows.get(1) ?? qualityStageRows.get(2) ?? [...qualityStageRows.values()][0]
  const qualityMaxStage = qualityStagePayload != null ? parseNumberListField(qualityStagePayload, 2) : []

  const qualityNeedLevel: Record<number, number[]> = {}
  for (const [id, payload] of qualityLevelRows) {
    qualityNeedLevel[id] = parseNumberListField(payload, 2)
  }

  return { stageMaxLevels, minQualityToLeave, qualityMaxStage, qualityNeedLevel }
}

export async function loadStageUpCatalog(): Promise<StageUpCatalogHero[]> {
  const { data, error } = await supabase
    .from('RoleConfig')
    .select('id, camp, stance, damagetype, occupation, quality, stage')
    .lte('id', 1499)
    .order('id')
  if (error) throw error
  return (data ?? [])
    .filter((row) => isHeroListed(Number(row.id)))
    .map((row) => ({
      id: Number(row.id),
      camp: Number(row.camp ?? 0),
      stance: Number(row.stance ?? 0),
      damagetype: Number(row.damagetype ?? 0),
      occupation: Number(row.occupation ?? 0),
      quality: Number(row.quality ?? 2),
      stage: Number(row.stage ?? 0),
    }))
}

export async function loadStageUpHeroBundle(
  heroId: number,
  lang: string,
  ladders: StageUpLadders
): Promise<StageUpHeroBundle | null> {
  if (!Number.isFinite(heroId) || !isHeroListed(heroId)) return null

  const [{ data: heroRow, error: heroError }, { data: roleRow }] = await Promise.all([
    supabase
      .from('HeroConfig')
      .select(
        'id, role_stage_consume_ids, role_stage_propety_ids, hero_quality_consume_ids, hero_quality_propety_ids, hero_quality_condition'
      )
      .eq('id', heroId)
      .maybeSingle(),
    supabase.from('RoleConfig').select('id, quality, stage').eq('id', heroId).maybeSingle(),
  ])
  if (heroError) throw heroError
  if (!heroRow) return null

  const stageConsumeIds = toNumberList(heroRow.role_stage_consume_ids)
  const stagePropertyIds = toNumberList(heroRow.role_stage_propety_ids)
  const qualityConsumeIds = toNumberList(heroRow.hero_quality_consume_ids)
  const qualityPropertyIds = toNumberList(heroRow.hero_quality_propety_ids)
  const orgQualityId = Number(heroRow.hero_quality_condition ?? 2)
  const baseQuality = Number(roleRow?.quality ?? 2)
  const baseStage = Number(roleRow?.stage ?? 0)

  const uniqueStageIds = [...new Set(stageConsumeIds)]
  const uniqueQualityIds = [...new Set(qualityConsumeIds)]
  const [stagePayloads, qualityPayloads] = await Promise.all([
    fetchPayloadRows('HeroStageConsumeConfig', uniqueStageIds),
    fetchPayloadRows('HeroQualityConsumeConfig', uniqueQualityIds),
  ])

  const stageConsumes = lookupFromPayloads(stagePayloads, uniqueStageIds, (payload, id) =>
    parseHeroStageConsumePayload(payload, id)
  )
  const qualityConsumes = lookupFromPayloads(qualityPayloads, uniqueQualityIds, (payload, id) =>
    parseHeroQualityConsumePayload(payload, id)
  )

  const seedEntries = [
    ...Object.values(stageConsumes).flatMap((s) => [...s.consume, ...s.consumeCurrency]),
    ...Object.values(qualityConsumes).flatMap((s) => [...s.consume, ...s.consumeCurrency]),
  ]
  const consumeRefMap = await loadConsumeRefMap(seedEntries, lang)

  return {
    heroId,
    baseQuality,
    baseStage,
    maxStage: Math.max(0, stagePropertyIds.length - 1),
    maxQuality: Math.max(baseQuality, qualityPropertyIds.length),
    orgQualityId: Number.isFinite(orgQualityId) && orgQualityId > 0 ? orgQualityId : 2,
    stageConsumeIds,
    qualityConsumeIds,
    stageConsumes,
    qualityConsumes,
    ladders,
    consumeRefMap,
  }
}
