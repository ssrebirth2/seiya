import type { ConsumeEntry } from '@/lib/game/parse-game-data'

export interface TalentUnlockEntry {
  desc?: string
  object_id?: number | null
  type?: string
  value?: number
}

export interface TalentSkillRef {
  skill_id?: number
  skill_lv?: number
}

export interface TalentAttributeEntry {
  stat: string
  isPercent: number
  value: number
}

export interface TalentLevelRow {
  id: number
  level: number
  attributes: TalentAttributeEntry[]
  consume: ConsumeEntry[]
}

export interface TalentPointData {
  id: number
  index: number
  levels: TalentLevelRow[]
}

export interface TalentLayerSkill {
  configId: number
  showSkillId: number | null
  realSkillId: number | null
  showSkillLv?: number
  realSkillLv?: number
  consume: ConsumeEntry[]
  heroConsume: ConsumeEntry[]
  generalItem: number | null
  /** SkillConfig row for showskill — exactly as configured in HeroTalentSkillConfig. */
  skillRow: Record<string, unknown> | null
}

export interface TalentLayerData {
  index: number
  layerId: number
  maxLevel: number
  unlock: TalentUnlockEntry[]
  points: TalentPointData[]
  layerSkill: TalentLayerSkill
}

export interface HeroTalentsData {
  heroId: number
  layers: TalentLayerData[]
  visibleStats: string[]
}
