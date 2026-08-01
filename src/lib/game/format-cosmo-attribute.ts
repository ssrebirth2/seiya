import { UI_KEYS } from '@/lib/i18n/ui-keys'
import type { CosmoStatBonus } from '@/lib/game/cosmo-types'

/** Mirrors GameUtil.GetAttributeValueDesc — ratioFlag 0 => percentage. */
export function formatCosmoAttributeValue(bonus: Pick<CosmoStatBonus, 'ratioFlag' | 'value'>): string {
  if (bonus.ratioFlag === 0) return `${bonus.value}%`
  return String(bonus.value)
}

export function formatCosmoAttributeLine(
  bonus: CosmoStatBonus,
  getT: (key?: string) => string
): { label: string; value: string } {
  const label = getT(bonus.statKey)
  const formatted = formatCosmoAttributeValue(bonus)
  const attFormat = getT(UI_KEYS.hero.cosmoAttFormat)
  const value = attFormat.includes('{0}') ? attFormat.replace(/\{0\}/g, formatted) : `+${formatted}`
  return { label, value }
}

/** Merge flat + % for the same stat into one row (less redundant display). */
export function formatGroupedCosmoAttributeLines(
  bonuses: CosmoStatBonus[],
  getT: (key?: string) => string
): { key: string; label: string; value: string }[] {
  const order: string[] = []
  const byStat = new Map<string, { flat?: CosmoStatBonus; percent?: CosmoStatBonus }>()

  for (const bonus of bonuses) {
    if (!byStat.has(bonus.statKey)) {
      order.push(bonus.statKey)
      byStat.set(bonus.statKey, {})
    }
    const slot = byStat.get(bonus.statKey)!
    if (bonus.ratioFlag === 0) slot.percent = bonus
    else slot.flat = bonus
  }

  const attFormat = getT(UI_KEYS.hero.cosmoAttFormat)
  const fmt = (bonus: CosmoStatBonus) => {
    const formatted = formatCosmoAttributeValue(bonus)
    return attFormat.includes('{0}') ? attFormat.replace(/\{0\}/g, formatted) : `+${formatted}`
  }

  return order.map((statKey) => {
    const slot = byStat.get(statKey)!
    const parts: string[] = []
    if (slot.flat) parts.push(fmt(slot.flat))
    if (slot.percent) parts.push(fmt(slot.percent))
    return {
      key: statKey,
      label: getT(statKey),
      value: parts.join('  '),
    }
  })
}

export function cosmoStatKey(bonus: Pick<CosmoStatBonus, 'statKey' | 'ratioFlag'>): string {
  return `${bonus.statKey}:${bonus.ratioFlag}`
}
