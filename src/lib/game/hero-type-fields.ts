import {
  getAttackTypeIconPath,
  getCampIconPath,
  getOccupationIconPath,
  getPositionIconPath,
} from '@/lib/game/hero-ui-sprites'
import type { LangTextMap } from '@/lib/changelog/types'

export const HERO_TYPE_FIELDS = ['occupation', 'camp', 'stance', 'damagetype'] as const

export type HeroTypeField = (typeof HERO_TYPE_FIELDS)[number]

export function isHeroTypeField(field: string): field is HeroTypeField {
  return (HERO_TYPE_FIELDS as readonly string[]).includes(field)
}

export function heroTypeFieldOf(field: string): HeroTypeField | null {
  const leaf = field.includes('.') ? field.slice(field.lastIndexOf('.') + 1) : field
  return isHeroTypeField(leaf) ? leaf : null
}

export function heroTypeDescKey(field: HeroTypeField, value: number): string {
  return `${field}_${value}`
}

export function heroTypeIconPath(field: HeroTypeField, value: number, lang?: string): string {
  switch (field) {
    case 'occupation':
      return getOccupationIconPath(value)
    case 'camp':
      return getCampIconPath(value)
    case 'stance':
      return getPositionIconPath(value, lang)
    case 'damagetype':
      return getAttackTypeIconPath(value)
  }
}

export function parseHeroTypeId(map: LangTextMap | undefined, lang: string): number | null {
  if (!map) return null
  const raw = map[lang] ?? map.EN ?? map.CN ?? Object.values(map).find((v) => v != null && v !== '')
  if (raw == null || raw === '') return null
  const n = Number(String(raw).trim())
  return Number.isFinite(n) ? n : null
}
