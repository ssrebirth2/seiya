import {
  getAttackTypeIconPath,
  getCampIconPath,
  getOccupationIconPath,
  getPositionIconPath,
} from '@/lib/game/hero-ui-sprites'
import {
  normalizeForceCardConditionList,
  type ForceCardEquipCondition,
} from '@/lib/game/parse-game-data'

export const FORCE_CARD_CONDITION_TYPES = [
  'stance',
  'damagetype',
  'occupation',
  'hero_camp',
  'camp',
  'hero_sids',
] as const

export type ForceCardConditionType = (typeof FORCE_CARD_CONDITION_TYPES)[number]

export type ForceCardRestrictionChip = {
  type: ForceCardConditionType
  objectId: number
  labelKey: string
  iconSrc?: string
  heroHref?: string
}

type HeroEquipFields = {
  sid?: number
  stance?: number
  position?: number
  damagetype?: number
  attackType?: number
  occupation?: number
  camp?: number
}

function normalizeConditionType(type: string): ForceCardConditionType | null {
  if (type === 'camp') return 'hero_camp'
  if ((FORCE_CARD_CONDITION_TYPES as readonly string[]).includes(type)) {
    return type as ForceCardConditionType
  }
  return null
}

function heroFieldValue(hero: HeroEquipFields, type: ForceCardConditionType): number | null {
  switch (type) {
    case 'stance':
      return hero.stance ?? hero.position ?? null
    case 'damagetype':
      return hero.damagetype ?? hero.attackType ?? null
    case 'occupation':
      return hero.occupation ?? null
    case 'hero_camp':
      return hero.camp ?? null
    case 'hero_sids':
      return hero.sid ?? null
    default:
      return null
  }
}

/** Port of DynamisUtil.GetLimit — buckets by condition type. */
export function bucketForceCardConditions(
  conditions: unknown
): Record<ForceCardConditionType, ForceCardEquipCondition[]> {
  const buckets = {
    stance: [] as ForceCardEquipCondition[],
    damagetype: [] as ForceCardEquipCondition[],
    occupation: [] as ForceCardEquipCondition[],
    hero_camp: [] as ForceCardEquipCondition[],
    camp: [] as ForceCardEquipCondition[],
    hero_sids: [] as ForceCardEquipCondition[],
  }

  normalizeForceCardConditionList(conditions).forEach((entry) => {
    const type = normalizeConditionType(entry.type)
    if (!type) return
    const target = type === 'hero_camp' ? buckets.hero_camp : buckets[type]
    target.push(entry)
  })

  return buckets
}

/**
 * Port of DynamisUtil.GetCurCardIsLimit — returns true when hero cannot equip.
 * Each non-empty condition type must include the hero's field value.
 */
export function isForceCardEquipLimited(
  hero: HeroEquipFields | null | undefined,
  conditions: unknown
): boolean {
  if (!hero) return false
  const buckets = bucketForceCardConditions(conditions)

  const checkBucket = (type: ForceCardConditionType, entries: ForceCardEquipCondition[]) => {
    if (!entries.length) return null
    const val = heroFieldValue(hero, type)
    if (val == null) return true
    let blocked = true
    for (const entry of entries) {
      blocked = !entry.object_id.includes(Number(val))
    }
    return blocked
  }

  for (const type of ['stance', 'damagetype', 'hero_sids', 'hero_camp', 'occupation'] as const) {
    const entries = buckets[type]
    const blocked = checkBucket(type, entries)
    if (blocked === false) return false
    if (blocked === true) return true
  }

  return false
}

export function canEquipForceCard(
  hero: HeroEquipFields | null | undefined,
  conditions: unknown
): boolean {
  if (!normalizeForceCardConditionList(conditions).length) return true
  return !isForceCardEquipLimited(hero, conditions)
}

/** @deprecated alias — use canEquipForceCard */
export function canEquipCard(
  hero: HeroEquipFields | null | undefined,
  card: { condition?: unknown }
): boolean {
  return canEquipForceCard(hero, card?.condition)
}

export function restrictionLabelKey(type: string, objectId: number): string {
  const normalized = normalizeConditionType(type)
  switch (normalized) {
    case 'stance':
      return `LC_HERO_stance_${objectId}`
    case 'damagetype':
      return `LC_HERO_damagetype_${objectId}`
    case 'occupation':
      return `LC_HERO_occupation_${objectId}`
    case 'hero_camp':
      return `LC_HERO_camp_${objectId}`
    case 'hero_sids':
      return `LC_HERO_hero_sids_${objectId}`
    default:
      return `LC_HERO_${type}_${objectId}`
  }
}

export function restrictionIconSrc(
  type: string,
  objectId: number,
  lang?: string
): string | undefined {
  const normalized = normalizeConditionType(type)
  switch (normalized) {
    case 'stance':
      return getPositionIconPath(objectId, lang)
    case 'damagetype':
      return getAttackTypeIconPath(objectId)
    case 'occupation':
      return getOccupationIconPath(objectId)
    case 'hero_camp':
      return getCampIconPath(objectId)
    case 'hero_sids':
      return undefined
    default:
      return undefined
  }
}

export function buildForceCardRestrictionChips(
  conditions: unknown,
  lang?: string
): ForceCardRestrictionChip[] {
  const chips: ForceCardRestrictionChip[] = []
  normalizeForceCardConditionList(conditions).forEach(({ type, object_id }) => {
    const normalized = normalizeConditionType(type)
    if (!normalized) return
    object_id.forEach((objectId) => {
      chips.push({
        type: normalized,
        objectId,
        labelKey: restrictionLabelKey(type, objectId),
        iconSrc: restrictionIconSrc(type, objectId, lang),
        heroHref: normalized === 'hero_sids' ? `/heroes/${objectId}` : undefined,
      })
    })
  })
  return chips
}

export function collectRestrictionTranslationKeys(conditions: unknown): string[] {
  const keys = new Set<string>()
  buildForceCardRestrictionChips(conditions).forEach((chip) => keys.add(chip.labelKey))
  return Array.from(keys)
}

export function getForceCardQualityTiers(
  cards: Array<{ quality?: number | null }>
): number[] {
  const tiers = new Set<number>()
  cards.forEach((card) => {
    const q = Number(card.quality)
    if (Number.isFinite(q) && q > 0) tiers.add(q)
  })
  return Array.from(tiers).sort((a, b) => a - b)
}

export type ForceCardRestrictionFilter = ForceCardConditionType

export function buildCardRestrictionTypeMap(
  rows: Array<{ id: number; condition?: unknown }>
): Map<number, Set<ForceCardRestrictionFilter>> {
  const map = new Map<number, Set<ForceCardRestrictionFilter>>()
  rows.forEach((row) => {
    const types = new Set<ForceCardRestrictionFilter>()
    normalizeForceCardConditionList(row.condition).forEach(({ type }) => {
      const normalized = normalizeConditionType(type)
      if (normalized && normalized !== 'camp') types.add(normalized)
    })
    if (types.size) map.set(row.id, types)
  })
  return map
}

export function cardMatchesRestrictionFilter(
  cardId: number,
  filter: string,
  restrictionMap: Map<number, Set<ForceCardRestrictionFilter>>
): boolean {
  if (!filter) return true
  const types = restrictionMap.get(cardId)
  return types?.has(filter as ForceCardRestrictionFilter) ?? false
}
