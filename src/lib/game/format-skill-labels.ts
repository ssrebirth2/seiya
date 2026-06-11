import { NOT_AVAILABLE_LABEL } from '@/lib/i18n/language-package'

/** LC key for SkillConfig.skill_type — returns null when type is absent/invalid. */
export function skillTypeLcKey(skillType: unknown): string | null {
  if (skillType == null || skillType === '') return null
  const n = Number(skillType)
  if (!Number.isFinite(n)) return null
  return `LC_SKILL_type_des_${n}`
}

export function resolveSkillTypeLabel(
  skillType: unknown,
  getT: (key?: string) => string
): string {
  const key = skillTypeLcKey(skillType)
  if (!key) return ''
  return getT(key)
}

export function isNotAvailableLabel(value?: string): boolean {
  return value === NOT_AVAILABLE_LABEL
}
