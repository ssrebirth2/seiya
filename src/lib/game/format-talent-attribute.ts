import type { TalentAttributeEntry } from '@/lib/game/talent-types'

/** Game uses is_percent=0 for percentage stats shown with a % suffix. */
export function formatTalentAttributeValue(value: number, isPercent: number): string {
  if (isPercent === 0) return `${value}%`
  return String(value)
}

export function formatTalentAttributeLabel(
  entry: TalentAttributeEntry,
  getT: (key?: string) => string
): string {
  const name = getT(entry.stat)
  const val = formatTalentAttributeValue(entry.value, entry.isPercent)
  return `${name}: +${val}`
}

export function formatUnlockRequirement(
  desc: string | undefined,
  value: number | undefined,
  getT: (key?: string) => string
): string {
  if (!desc) return ''
  const template = getT(desc)
  if (value == null) return template
  return template.replace(/\{0\}/g, String(value))
}

export function filterVisibleAttributes(
  attributes: TalentAttributeEntry[],
  visibleStats: string[]
): TalentAttributeEntry[] {
  if (!visibleStats.length) return attributes
  const allowed = new Set(visibleStats)
  return attributes.filter((a) => allowed.has(a.stat))
}
