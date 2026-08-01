import type { CosmoUnlockEntry } from '@/lib/game/cosmo-types'

/** Fill `{0}`, `{1}`, … in an LC template (mirrors GetLCString args). */
export function applyLcPlaceholders(template: string, args: Array<string | number | undefined | null>): string {
  return template.replace(/\{(\d+)\}/g, (_, index) => {
    const arg = args[Number(index)]
    return arg == null ? '' : String(arg)
  })
}

/**
 * Cosmo domain unlock lines — mirrors SenseData:GetUnlockTip / GetUnlockSenseValue.
 * - `uv`: required total sense UV (`LC_COSMO_sense_total_value_with_replacement`)
 * - `hero_stage` + `LC_UNLOCK_cosmo_domain_condition`: `{0}` = hero name, `{1}` = stage
 */
export function formatCosmoDomainUnlockLines(
  unlocks: CosmoUnlockEntry[],
  getT: (key?: string) => string,
  heroName: string
): string[] {
  const lines: string[] = []

  for (const unlock of unlocks) {
    if (unlock.type === 'uv') {
      if (unlock.value == null) continue
      const tpl = getT('LC_COSMO_sense_total_value_with_replacement')
      lines.push(applyLcPlaceholders(tpl, [unlock.value]))
      continue
    }

    const desc = unlock.desc
    if (!desc) continue

    const template = getT(desc)
    if (unlock.type === 'hero_stage' || /\{1\}/.test(template)) {
      lines.push(applyLcPlaceholders(template, [heroName, unlock.value ?? 0]))
      continue
    }

    if (unlock.value != null) {
      lines.push(applyLcPlaceholders(template, [unlock.value]))
    } else {
      lines.push(template)
    }
  }

  return lines.filter(Boolean)
}
