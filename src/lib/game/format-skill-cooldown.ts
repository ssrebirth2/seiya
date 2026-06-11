/** SkillConfig.cd: -1 or null/undefined means no cooldown. */
export function hasSkillCooldown(cd: unknown): boolean {
  if (cd == null || cd === '' || cd === -1 || cd === '-1') return false
  return true
}

export function formatSkillCooldown(cd: unknown): string {
  if (!hasSkillCooldown(cd)) return ''
  return String(cd)
}
