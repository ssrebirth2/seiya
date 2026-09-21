import { normalizeDesValueList } from '@/lib/game/parse-game-data'
import type { SkillConfigRow } from '@/lib/game/skill-completeness'

const LINK_ID_RE = /<link=(\d+)>/gi

/** Feature / glossary link ids embedded in skill description HTML (`<link=ID>`). */
export function extractLinkIdsFromText(text: string): number[] {
  if (!text) return []
  const ids: number[] = []
  LINK_ID_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = LINK_ID_RE.exec(text))) {
    const id = Number(match[1])
    if (Number.isFinite(id) && id > 0) ids.push(id)
  }
  return ids
}

export function skillFeatureNameLcKey(featureId: number): string {
  return `LC_SKILL_Feature_name_${featureId}`
}

/** Collect all feature link ids referenced by a skill's des / sketch / awaken texts. */
export function collectSkillLinkIds(
  skill: SkillConfigRow,
  getT: (key?: string) => string
): number[] {
  const ids = new Set<number>()
  for (const field of ['skill_des', 'skill_sketch', 'awaken_skill_des'] as const) {
    for (const entry of normalizeDesValueList(skill[field])) {
      if (!entry.des) continue
      for (const id of extractLinkIdsFromText(getT(entry.des))) ids.add(id)
    }
  }
  return [...ids]
}

export type SkillTagOption = {
  /** Encoded select value: `l12|f3` */
  value: string
  /** Display label (already translated). */
  label: string
  labelIds: number[]
  featureIds: number[]
}

function normalizeTagName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function encodeSkillTagValue(labelIds: number[], featureIds: number[]): string {
  const parts = [
    ...[...new Set(labelIds)].sort((a, b) => a - b).map((id) => `l${id}`),
    ...[...new Set(featureIds)].sort((a, b) => a - b).map((id) => `f${id}`),
  ]
  return parts.join('|')
}

export function parseSkillTagValue(value: string): { labelIds: number[]; featureIds: number[] } {
  const labelIds: number[] = []
  const featureIds: number[] = []
  if (!value.trim()) return { labelIds, featureIds }
  for (const part of value.split('|')) {
    if (part.startsWith('l')) {
      const n = Number(part.slice(1))
      if (Number.isFinite(n)) labelIds.push(n)
    } else if (part.startsWith('f')) {
      const n = Number(part.slice(1))
      if (Number.isFinite(n)) featureIds.push(n)
    }
  }
  return { labelIds, featureIds }
}

/**
 * Build tag filter options from SkillLabelConfig + skill description feature links.
 * Merges entries that share the same display name (case/accent insensitive).
 */
export function buildSkillTagOptions(args: {
  labels: { id: number; nameKey: string }[]
  /** featureId → skills that reference it (only used features). */
  usedFeatureIds: number[]
  getT: (key?: string) => string
  noData: string
}): SkillTagOption[] {
  const { labels, usedFeatureIds, getT, noData } = args
  const byName = new Map<
    string,
    { label: string; labelIds: Set<number>; featureIds: Set<number> }
  >()

  const push = (rawName: string, kind: 'label' | 'feature', id: number) => {
    const label = rawName.trim()
    if (!label || label === noData) return
    const key = normalizeTagName(label)
    if (!key) return
    let entry = byName.get(key)
    if (!entry) {
      entry = { label, labelIds: new Set(), featureIds: new Set() }
      byName.set(key, entry)
    }
    if (kind === 'label') entry.labelIds.add(id)
    else entry.featureIds.add(id)
  }

  for (const item of labels) {
    const name = getT(item.nameKey)
    if (!name || name === item.nameKey) continue
    push(name, 'label', item.id)
  }

  for (const featureId of usedFeatureIds) {
    const nameKey = skillFeatureNameLcKey(featureId)
    const name = getT(nameKey)
    if (!name || name === nameKey) continue
    push(name, 'feature', featureId)
  }

  return [...byName.values()]
    .map((entry) => {
      const labelIds = [...entry.labelIds]
      const featureIds = [...entry.featureIds]
      return {
        value: encodeSkillTagValue(labelIds, featureIds),
        label: entry.label,
        labelIds,
        featureIds,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label) || a.value.localeCompare(b.value))
}

export function skillMatchesTagFilter(
  row: { labelIds: number[]; featureIds: number[] },
  tagValue: string
): boolean {
  if (!tagValue) return true
  const { labelIds, featureIds } = parseSkillTagValue(tagValue)
  if (labelIds.some((id) => row.labelIds.includes(id))) return true
  if (featureIds.some((id) => row.featureIds.includes(id))) return true
  return false
}
