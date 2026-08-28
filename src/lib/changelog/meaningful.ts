import type { ChangelogChange, ChangelogEntry, LangTextMap } from '@/lib/changelog/types'

function parseJsonish(value: unknown): unknown {
  if (value == null || value === '') return null
  if (typeof value !== 'string') return value
  const t = value.trim()
  if (
    (t.startsWith('[') && t.endsWith(']')) ||
    (t.startsWith('{') && t.endsWith('}'))
  ) {
    try {
      return JSON.parse(t)
    } catch {
      return value
    }
  }
  return value
}

function canonicalize(value: unknown, key = ''): unknown {
  const parsed = key ? value : parseJsonish(value)
  if (parsed == null) return null
  if (Array.isArray(parsed)) {
    const mapped = parsed.map((item) => canonicalize(item))
    if (key === 'skill_up') {
      return mapped
        .filter((item) => item != null)
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    }
    return mapped
  }
  if (typeof parsed === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(parsed as object).sort()) {
      const next = canonicalize((parsed as Record<string, unknown>)[k], k)
      if (next != null) out[k] = next
    }
    return out
  }
  return parsed
}

function sampleLangValue(map: LangTextMap | undefined): string {
  if (!map) return ''
  return String(map.PT || map.EN || map.CN || Object.values(map).find(Boolean) || '')
}

function langMapNonEmptyValues(map: LangTextMap | undefined): string[] {
  if (!map) return []
  return Object.values(map).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

function isLcKeyString(value: string): boolean {
  return value.trim().startsWith('LC_')
}

/**
 * Diff is only LC_* keys — remaps, empty→key, or key→empty.
 * Users care about resolved skill/hero text, not `LC_SKILL_skill_name_10106`.
 */
export function isLcKeyOnlyChange(change: ChangelogChange): boolean {
  const vals = [
    ...langMapNonEmptyValues(change.before),
    ...langMapNonEmptyValues(change.after),
  ]
  return vals.length > 0 && vals.every(isLcKeyString)
}

/** Internal config fields — not gameplay copy the catalog should surface. */
const INTERNAL_PATCH_FIELDS = new Set([
  'label_list',
  'skill_type',
  'skill_condition',
  'sub_skills',
  'iconpath',
  'skill_quality',
  'nameKey',
  'valueIds',
  'quality',
  'initial_quality',
  'general_item',
  'consume',
])

const INTERNAL_OBJECT_KEYS = new Set([
  'quality',
  'initial_quality',
  'general_item',
  'consume',
  'id',
  'sid',
])

export function isInternalPatchField(field: string): boolean {
  return INTERNAL_PATCH_FIELDS.has(field)
}

export function isCanonicalEqual(before: unknown, after: unknown): boolean {
  return JSON.stringify(canonicalize(before)) === JSON.stringify(canonicalize(after))
}

/** Previous snapshot stored the entity id when an LC key had not resolved yet. */
export function isIdFallbackChange(
  change: ChangelogChange,
  entityId: string | number
): boolean {
  const id = String(entityId)
  const langs = new Set([
    ...Object.keys(change.before || {}),
    ...Object.keys(change.after || {}),
  ])
  if (langs.size === 0) return false
  let sawId = false
  for (const lang of langs) {
    const before = String(change.before?.[lang] ?? '').trim()
    if (before === id) sawId = true
    else if (before !== '') return false
  }
  return sawId
}

export function isNoiseChange(
  change: ChangelogChange,
  entityId: string | number
): boolean {
  if (isInternalPatchField(change.field)) return true
  if (isIdFallbackChange(change, entityId)) return true
  if (isLcKeyOnlyChange(change)) return true
  const before = sampleLangValue(change.before)
  const after = sampleLangValue(change.after)
  if (isCanonicalEqual(before, after)) return true
  if (!isTextChangeField(change.field)) {
    return summarizeStructuralChange(change, 'EN').length === 0
  }
  return false
}

export function isTextChangeField(field: string): boolean {
  return (
    field === 'name' ||
    field === 'desc' ||
    field === 'skill_des' ||
    field === 'role_introduction' ||
    field === 'role_features' ||
    field.endsWith('.desc') ||
    field.endsWith('.name') ||
    field.startsWith('skill_sketch')
  )
}

export type StructuralDelta = {
  key: string
  before?: string
  after?: string
}

function summarizeSteps(before: unknown[], after: unknown[]): StructuralDelta[] {
  const lines: StructuralDelta[] = []
  const max = Math.max(before.length, after.length)
  for (let i = 0; i < max; i++) {
    const b = before[i] as Record<string, unknown> | undefined
    const a = after[i] as Record<string, unknown> | undefined
    const star = Number(a?.star_level ?? b?.star_level ?? i + 1)
    if (!b && a) {
      lines.push({ key: `star:${star}`, after: 'added' })
      continue
    }
    if (b && !a) {
      lines.push({ key: `star:${star}`, before: 'removed' })
      continue
    }
    if (!b || !a) continue
    if (!isCanonicalEqual(canonicalize(b.skill_up, 'skill_up'), canonicalize(a.skill_up, 'skill_up'))) {
      lines.push({
        key: `star:${star}:skill_up`,
        before: JSON.stringify(b.skill_up ?? ''),
        after: JSON.stringify(a.skill_up ?? ''),
      })
    }
  }
  return lines
}

function summarizeObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): StructuralDelta[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const lines: StructuralDelta[] = []
  for (const key of keys) {
    if (INTERNAL_OBJECT_KEYS.has(key)) continue
    if (isCanonicalEqual(before[key], after[key])) continue
    const b = before[key]
    const a = after[key]
    const bText = b == null ? '' : typeof b === 'object' ? JSON.stringify(b) : String(b)
    const aText = a == null ? '' : typeof a === 'object' ? JSON.stringify(a) : String(a)
    if (bText.length > 160 || aText.length > 160) {
      lines.push({ key })
    } else {
      lines.push({ key, before: bText, after: aText })
    }
  }
  return lines
}

export function summarizeStructuralChange(
  change: ChangelogChange | undefined,
  lang: string
): StructuralDelta[] {
  if (!change) return []
  const rawBefore = change.before?.[lang] ?? sampleLangValue(change.before)
  const rawAfter = change.after?.[lang] ?? sampleLangValue(change.after)
  const before = parseJsonish(rawBefore)
  const after = parseJsonish(rawAfter)

  if (
    Array.isArray(before) &&
    Array.isArray(after) &&
    (change.field === 'steps' ||
      (before[0] && typeof before[0] === 'object' && 'star_level' in (before[0] as object)) ||
      (after[0] && typeof after[0] === 'object' && 'star_level' in (after[0] as object)))
  ) {
    return summarizeSteps(before, after)
  }

  if (
    before &&
    after &&
    typeof before === 'object' &&
    typeof after === 'object' &&
    !Array.isArray(before) &&
    !Array.isArray(after)
  ) {
    return summarizeObjects(before as Record<string, unknown>, after as Record<string, unknown>)
  }

  const bText = rawBefore == null ? '' : String(rawBefore)
  const aText = rawAfter == null ? '' : String(rawAfter)
  if (bText === aText) return []
  if (bText.length <= 120 && aText.length <= 120) {
    return [{ key: change.field, before: bText, after: aText }]
  }
  return [{ key: change.field }]
}

export function stripNoiseChanges(entry: ChangelogEntry): ChangelogEntry | null {
  // Added skills with no text payload are just an unresolved name (e.g. 闪电光牙).
  if (
    entry.action === 'added' &&
    (entry.entityType === 'skill' || entry.entityType === 'bond') &&
    !entry.changes?.length
  ) {
    return null
  }
  if (entry.action !== 'updated') return entry
  const changes = (entry.changes || []).filter((change) => !isNoiseChange(change, entry.entityId))
  if (!changes.length) return null
  return { ...entry, changes }
}
