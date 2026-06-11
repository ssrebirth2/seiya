export type DesValueEntry = { des?: string; value?: number }
export type SkillRef = { skill_id: number; skill_lv?: number }
export type ConsumeEntry = { num: number; type?: string; sid?: number }

/** Parse JSON string, array, or single object into a flat array. */
export function parseGameData(val: unknown): unknown[] {
  if (val == null || val === '') return []
  try {
    if (typeof val === 'string') {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed
      if (typeof parsed === 'object' && parsed !== null) return [parsed]
      return []
    }
    if (Array.isArray(val)) return val
    if (typeof val === 'object') return [val]
  } catch {
    return []
  }
  return []
}

/** `[des, value]` or `{ des, value }` → normalized object. */
export function normalizeDesValue(entry: unknown): DesValueEntry | null {
  if (entry == null) return null
  if (Array.isArray(entry)) {
    if (entry.length === 0) return null
    if (typeof entry[0] === 'string' && entry.length >= 2) {
      return { des: String(entry[0]), value: Number(entry[1]) }
    }
    if (typeof entry[0] === 'string') return { des: String(entry[0]) }
    return null
  }
  if (typeof entry === 'object') {
    const o = entry as Record<string, unknown>
    if (o.des != null) {
      return {
        des: String(o.des),
        value: o.value != null ? Number(o.value) : undefined,
      }
    }
  }
  if (typeof entry === 'string') return { des: entry }
  return null
}

export function normalizeDesValueList(val: unknown): DesValueEntry[] {
  return parseGameData(val)
    .map(normalizeDesValue)
    .filter((e): e is DesValueEntry => e != null)
}

/** `[skill_id, skill_lv]` or `{ skill_id, skill_lv }` → normalized object. */
export function normalizeSkillRef(entry: unknown): SkillRef | null {
  if (entry == null) return null
  if (Array.isArray(entry) && entry.length >= 1) {
    const skill_id = Number(entry[0])
    if (Number.isNaN(skill_id)) return null
    return {
      skill_id,
      skill_lv: entry.length >= 2 ? Number(entry[1]) : undefined,
    }
  }
  if (typeof entry === 'object') {
    const o = entry as Record<string, unknown>
    if (o.skill_id != null) {
      return {
        skill_id: Number(o.skill_id),
        skill_lv: o.skill_lv != null ? Number(o.skill_lv) : undefined,
      }
    }
  }
  if (typeof entry === 'number' || (typeof entry === 'string' && entry !== '' && !Number.isNaN(Number(entry)))) {
    return { skill_id: Number(entry) }
  }
  return null
}

export function normalizeSkillRefList(val: unknown): SkillRef[] {
  return parseGameData(val)
    .map(normalizeSkillRef)
    .filter((e): e is SkillRef => e != null)
}

/** Last skill_id from a quality `skill_info` field (tuple or object format). */
export function extractSkillIdFromInfo(info: unknown): number | null {
  const items = parseGameData(info)
  for (let i = items.length - 1; i >= 0; i--) {
    const ref = normalizeSkillRef(items[i])
    if (ref?.skill_id) return ref.skill_id
  }
  if (typeof info === 'string' && info !== '' && !Number.isNaN(Number(info))) return Number(info)
  if (typeof info === 'number') return info
  return null
}

/** Condition string from string, tuple, or `{ condition }` entry. */
export function normalizeCondition(entry: unknown): string {
  if (entry == null) return ''
  if (typeof entry === 'string') return entry
  if (Array.isArray(entry) && typeof entry[0] === 'string') return entry[0]
  if (typeof entry === 'object' && 'condition' in (entry as object)) {
    return String((entry as { condition: unknown }).condition)
  }
  return ''
}

export function normalizeConditionList(val: unknown): string[] {
  return parseGameData(val).map(normalizeCondition).filter(Boolean)
}

/** `[num, type]` or `{ num, type }` consume entry. */
export function normalizeConsumeEntry(entry: unknown): ConsumeEntry | null {
  if (entry == null) return null
  if (Array.isArray(entry) && entry.length >= 1) {
    return {
      num: Number(entry[0]),
      sid: entry.length >= 2 && typeof entry[1] === 'number' ? Number(entry[1]) : undefined,
      type: entry.length >= 2 ? String(entry[entry.length - 1]) : undefined,
    }
  }
  if (typeof entry === 'object') {
    const o = entry as Record<string, unknown>
    if (o.num != null) {
      return {
        num: Number(o.num),
        sid: o.sid != null ? Number(o.sid) : undefined,
        type: o.type != null ? String(o.type) : undefined,
      }
    }
  }
  return null
}

export function normalizeConsumeList(val: unknown): ConsumeEntry[] {
  return parseGameData(val)
    .map(normalizeConsumeEntry)
    .filter((e): e is ConsumeEntry => e != null)
}

/** Primitive list (e.g. label_list, sub_skills). */
export function parsePrimitiveList(val: unknown): (string | number)[] {
  return parseGameData(val).flatMap((item) => {
    if (typeof item === 'number' || typeof item === 'string') return [item]
    return []
  })
}
