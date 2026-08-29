import { aggregateConsume } from '@/lib/game/aggregate-consume'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'

export type StageConsumeLookup = {
  consume: ConsumeEntry[]
  consumeCurrency: ConsumeEntry[]
}

export type StageUpLadders = {
  /** index = stage (0-based), value = max level */
  stageMaxLevels: number[]
  /** index = stage, value = min quality to leave that stage */
  minQualityToLeave: number[]
  /** index = quality - 1, value = max stage at that quality */
  qualityMaxStage: number[]
  /** orgQualityId → role_lvs (index = quality - 1) */
  qualityNeedLevel: Record<number, number[]>
}

export type StageUpHeroData = {
  heroId: number
  baseQuality: number
  baseStage: number
  maxStage: number
  maxQuality: number
  orgQualityId: number
  stageConsumeIds: number[]
  qualityConsumeIds: number[]
  stageConsumes: Record<number, StageConsumeLookup>
  qualityConsumes: Record<number, StageConsumeLookup>
}

export type StagePlanInput = {
  fromStage: number
  toStage: number
  currentQuality: number
}

export type StagePlanStep = {
  fromStage: number
  toStage: number
  consumeId: number | null
  materials: ConsumeEntry[]
  blocked: boolean
  minQuality: number
  levelCapFrom: number
  levelCapTo: number
  dataError: boolean
}

export type QualityPlanStep = {
  fromQuality: number
  toQuality: number
  consumeId: number | null
  materials: ConsumeEntry[]
  needLv: number
  minStageForNeedLv: number
  capAtMinStage: number
  billable: boolean
  dataError: boolean
}

export type StageUpPlan = {
  fromStage: number
  toStage: number
  currentQuality: number
  absMaxStage: number
  qualityMaxStage: number
  levelCapFrom: number
  levelCapTo: number
  stageSteps: StagePlanStep[]
  unlockedMaterials: ConsumeEntry[]
  allStageMaterials: ConsumeEntry[]
  qualitySteps: QualityPlanStep[]
  qualityMaterials: ConsumeEntry[]
}

export function sortStageMaterials(items: ConsumeEntry[]): ConsumeEntry[] {
  return [...items].sort((a, b) => (b.sid ?? 0) - (a.sid ?? 0))
}

function stepMaterials(lookup: StageConsumeLookup | undefined): ConsumeEntry[] {
  if (!lookup) return []
  return sortStageMaterials(
    [...lookup.consume, ...lookup.consumeCurrency].filter((item) => item.num > 0)
  )
}

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

/** Keep a valid from < to window on the stage ladder (swap if inverted). */
export function clampStageRange(
  fromStage: number,
  toStage: number,
  maxStage: number
): { from: number; to: number } {
  const max = Math.max(0, Math.trunc(maxStage))
  let from = clampInt(fromStage, 0, max)
  let to = clampInt(toStage, 0, max)
  if (to < from) {
    const swap = from
    from = to
    to = swap
  }
  if (from === to && max > 0) {
    if (to < max) to += 1
    else from -= 1
  }
  return { from, to }
}

export function getQualityMaxStage(ladders: StageUpLadders, quality: number): number {
  return ladders.qualityMaxStage[quality - 1] ?? 0
}

export function getMinQualityToLeave(ladders: StageUpLadders, stage: number): number {
  return ladders.minQualityToLeave[stage] ?? 1
}

export function getCurMaxLevelEx(ladders: StageUpLadders, stage: number): number {
  return ladders.stageMaxLevels[stage] ?? 0
}

export function getQualityNeedLevel(
  ladders: StageUpLadders,
  orgQualityId: number,
  quality: number
): number {
  const row = ladders.qualityNeedLevel[orgQualityId] ?? ladders.qualityNeedLevel[2] ?? []
  return row[quality - 1] ?? 0
}

export function minStageForLevelCap(ladders: StageUpLadders, needLv: number): number {
  for (let stage = 0; stage < ladders.stageMaxLevels.length; stage++) {
    if (ladders.stageMaxLevels[stage] >= needLv) return stage
  }
  return Math.max(0, ladders.stageMaxLevels.length - 1)
}

export function isStageStepBlocked(
  ladders: StageUpLadders,
  stage: number,
  currentQuality: number
): boolean {
  if (stage >= getQualityMaxStage(ladders, currentQuality)) return true
  return currentQuality < getMinQualityToLeave(ladders, stage)
}

function requiredQualityForTarget(
  ladders: StageUpLadders,
  currentQuality: number,
  maxQuality: number,
  toStage: number
): number {
  let quality = currentQuality
  while (quality < maxQuality && getQualityMaxStage(ladders, quality) < toStage) {
    quality += 1
  }
  return quality
}

export function computeStagePlan(
  hero: StageUpHeroData,
  ladders: StageUpLadders,
  input: StagePlanInput
): StageUpPlan {
  const absMaxStage = Math.max(0, hero.maxStage)
  const maxQuality = Math.max(hero.baseQuality, hero.maxQuality)
  const currentQuality = clampInt(input.currentQuality, hero.baseQuality, maxQuality)
  const fromStage = clampInt(input.fromStage, 0, absMaxStage)
  const toStage = clampInt(input.toStage, 0, absMaxStage)

  const qualityCap = getQualityMaxStage(ladders, currentQuality)
  const levelCapFrom = getCurMaxLevelEx(ladders, fromStage)
  const levelCapTo = getCurMaxLevelEx(ladders, toStage)

  if (fromStage >= toStage) {
    return {
      fromStage,
      toStage,
      currentQuality,
      absMaxStage,
      qualityMaxStage: qualityCap,
      levelCapFrom,
      levelCapTo,
      stageSteps: [],
      unlockedMaterials: [],
      allStageMaterials: [],
      qualitySteps: [],
      qualityMaterials: [],
    }
  }

  const stageSteps: StagePlanStep[] = []
  for (let stage = fromStage; stage < toStage; stage++) {
    const consumeId = hero.stageConsumeIds[stage] ?? null
    const lookup = consumeId != null ? hero.stageConsumes[consumeId] : undefined
    const dataError = consumeId == null || lookup == null
    const materials = dataError ? [] : stepMaterials(lookup)
    stageSteps.push({
      fromStage: stage,
      toStage: stage + 1,
      consumeId,
      materials,
      blocked: isStageStepBlocked(ladders, stage, currentQuality),
      minQuality: getMinQualityToLeave(ladders, stage),
      levelCapFrom: getCurMaxLevelEx(ladders, stage),
      levelCapTo: getCurMaxLevelEx(ladders, stage + 1),
      dataError,
    })
  }

  const unlockedMaterials = aggregateConsume(
    stageSteps.filter((step) => !step.blocked && !step.dataError).flatMap((step) => step.materials)
  )
  const allStageMaterials = aggregateConsume(
    stageSteps.filter((step) => !step.dataError).flatMap((step) => step.materials)
  )

  const targetQuality = requiredQualityForTarget(ladders, currentQuality, maxQuality, toStage)
  const qualitySteps: QualityPlanStep[] = []
  for (let quality = currentQuality; quality < targetQuality; quality++) {
    const consumeId = hero.qualityConsumeIds[quality - 1] ?? null
    const lookup = consumeId != null ? hero.qualityConsumes[consumeId] : undefined
    const materials = lookup ? stepMaterials(lookup) : []
    const billable = materials.length > 0
    const dataError = consumeId == null || (lookup == null && consumeId != null)
    const needLv = getQualityNeedLevel(ladders, hero.orgQualityId, quality)
    const minStageForNeedLv = minStageForLevelCap(ladders, needLv)
    qualitySteps.push({
      fromQuality: quality,
      toQuality: quality + 1,
      consumeId,
      materials,
      needLv,
      minStageForNeedLv,
      capAtMinStage: getCurMaxLevelEx(ladders, minStageForNeedLv),
      billable,
      dataError: Boolean(dataError && billable),
    })
  }

  const qualityMaterials = aggregateConsume(
    qualitySteps.filter((step) => step.billable && !step.dataError).flatMap((step) => step.materials)
  )

  return {
    fromStage,
    toStage,
    currentQuality,
    absMaxStage,
    qualityMaxStage: qualityCap,
    levelCapFrom,
    levelCapTo,
    stageSteps,
    unlockedMaterials,
    allStageMaterials,
    qualitySteps,
    qualityMaterials,
  }
}
