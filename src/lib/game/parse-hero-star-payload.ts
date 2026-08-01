import {
  normalizeConsumeList,
  normalizeSkillRefList,
  parseGameData,
  type ConsumeEntry,
  type SkillRef,
} from '@/lib/game/parse-game-data'

/** HeroStarUpConfig.lua format indices as string keys (icon builder). */
const STAR = {
  id: '1',
  attribute_id: '2',
  skill_up: '3',
  skill_info: '4',
  consume_currency: '5',
  consume: '6',
  general_item: '7',
} as const

export type HeroStarUpStep = {
  id: number
  attributeId: number | null
  skillUp: SkillRef[]
  skillInfo: SkillRef[]
  consume: ConsumeEntry[]
  consumeCurrency: ConsumeEntry[]
  generalItem: number | null
}

function asDict(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>
  }
  const parsed = parseGameData(payload)
  if (parsed.length === 1 && parsed[0] && typeof parsed[0] === 'object') {
    return parsed[0] as Record<string, unknown>
  }
  return {}
}

export function parseHeroStarUpPayload(payload: unknown, fallbackId?: number): HeroStarUpStep {
  const row = asDict(payload)
  const id = Number(row[STAR.id] ?? fallbackId ?? 0)
  const attr = row[STAR.attribute_id]
  const general = row[STAR.general_item]
  return {
    id: Number.isFinite(id) ? id : Number(fallbackId ?? 0),
    attributeId: attr != null && Number.isFinite(Number(attr)) ? Number(attr) : null,
    skillUp: normalizeSkillRefList(row[STAR.skill_up]),
    skillInfo: normalizeSkillRefList(row[STAR.skill_info]),
    consume: normalizeConsumeList(row[STAR.consume]),
    consumeCurrency: normalizeConsumeList(row[STAR.consume_currency]),
    generalItem: general != null && Number.isFinite(Number(general)) ? Number(general) : null,
  }
}
