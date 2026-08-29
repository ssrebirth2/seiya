import {
  normalizeConsumeList,
  parseGameData,
  parsePrimitiveList,
  type ConsumeEntry,
} from '@/lib/game/parse-game-data'

/** Read Lua 1-based field from a raw_payload array or icon-builder dict. */
export function payloadAt(payload: unknown, luaIndex: number): unknown {
  if (payload == null) return undefined
  if (Array.isArray(payload)) return payload[luaIndex - 1]
  if (typeof payload === 'object') {
    const row = payload as Record<string, unknown>
    if (luaIndex in row) return row[luaIndex]
    const key = String(luaIndex)
    if (key in row) return row[key]
  }
  return undefined
}

function asPayload(payload: unknown): unknown {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload)
    } catch {
      return payload
    }
  }
  return payload
}

export type StageConsumeStep = {
  id: number
  consume: ConsumeEntry[]
  consumeCurrency: ConsumeEntry[]
}

export type QualityConsumeStep = {
  id: number
  consume: ConsumeEntry[]
  consumeCurrency: ConsumeEntry[]
}

/** HeroStageConsumeConfig: id, role_stage_consume_currency, role_stage_consume */
export function parseHeroStageConsumePayload(payload: unknown, fallbackId?: number): StageConsumeStep {
  const row = asPayload(payload)
  const id = Number(payloadAt(row, 1) ?? fallbackId ?? 0)
  return {
    id: Number.isFinite(id) ? id : Number(fallbackId ?? 0),
    consumeCurrency: normalizeConsumeList(payloadAt(row, 2)),
    consume: normalizeConsumeList(payloadAt(row, 3)),
  }
}

/** HeroQualityConsumeConfig: id, role_quality_consume, consume_currency, condition */
export function parseHeroQualityConsumePayload(payload: unknown, fallbackId?: number): QualityConsumeStep {
  const row = asPayload(payload)
  const id = Number(payloadAt(row, 1) ?? fallbackId ?? 0)
  return {
    id: Number.isFinite(id) ? id : Number(fallbackId ?? 0),
    consume: normalizeConsumeList(payloadAt(row, 2)),
    consumeCurrency: normalizeConsumeList(payloadAt(row, 3)),
  }
}

export function parseNumberListField(payload: unknown, luaIndex: number): number[] {
  return parsePrimitiveList(payloadAt(asPayload(payload), luaIndex))
    .map(Number)
    .filter((n) => Number.isFinite(n))
}

export type StageQualityCondition = {
  type: string
  value: number
}

function parseConditionEntry(entry: unknown): StageQualityCondition | null {
  if (entry == null) return null
  if (Array.isArray(entry) && entry.length >= 4) {
    const type = entry[2] != null ? String(entry[2]) : ''
    const value = Number(entry[3])
    if (!type || !Number.isFinite(value)) return null
    return { type, value }
  }
  if (typeof entry === 'object') {
    const o = entry as Record<string, unknown>
    const type = o.type != null ? String(o.type) : ''
    const value = Number(o.value)
    if (!type || !Number.isFinite(value)) return null
    return { type, value }
  }
  return null
}

/** HeroStageConditionConfig.condition → min hero_quality to leave this stage. */
export function parseMinQualityFromConditionPayload(payload: unknown): number | null {
  const row = asPayload(payload)
  const raw = payloadAt(row, 2)
  const entries = parseGameData(raw)
  for (const entry of entries) {
    const parsed = parseConditionEntry(entry)
    if (parsed?.type === 'hero_quality') return parsed.value
  }
  return null
}
