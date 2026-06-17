/** SkillConfig.cd: -1 or null/undefined means no cooldown. */
export function hasSkillCooldown(cd: unknown): boolean {
  if (cd == null || cd === '' || cd === -1 || cd === '-1') return false
  return true
}

const DATA_SECONDS_KEY = 'LC_COMMON_data_seconds'

/** e.g. 15 + LC_COMMON_data_seconds → "15s" (or "15detik" in ID). */
export function formatSkillCooldown(
  cd: unknown,
  getT?: (key?: string) => string
): string {
  if (!hasSkillCooldown(cd)) return ''
  const value = String(cd)
  if (!getT) return value
  return `${value}${getT(DATA_SECONDS_KEY)}`
}
