import { IMAGE_UNAVAILABLE, isAssetAvailable } from '@/lib/assets/asset-registry'
import { applySkillValues } from '@/lib/game/apply-skill-values'
import { normalizeDesValueList, parsePrimitiveList } from '@/lib/game/parse-game-data'
import { resolveSkillIconUrl } from '@/lib/game/resolve-skill-icon'
import { getSkillIdBand, isAutoAttackStub, type SkillIdBand } from '@/lib/game/skill-id-band'
import type { SkillOwner } from '@/lib/game/skill-owners'

export type SkillCompleteness =
  | 'full'
  | 'name_icon'
  | 'des_only'
  | 'icon_only'
  | 'name_des'
  | 'empty'

export type SkillCatalogLayer = 'catalog' | 'sneakPeek' | 'hidden'

export type SkillConfigRow = {
  skillid: number
  name?: string | null
  iconpath?: string | null
  skill_type?: number | null
  cd?: number | null
  label_list?: unknown
  sub_skills?: unknown
  skill_des?: unknown
  skill_sketch?: unknown
  awaken_skill_des?: unknown
  skill_quality?: number | null
  skill_condition?: unknown
}

export type SkillCompletenessFlags = {
  hasNameKey: boolean
  hasIconPath: boolean
  hasIconFile: boolean
  hasDes: boolean
  hasLevels: boolean
  hasSubSkills: boolean
  completeness: SkillCompleteness
}

const CATALOG_OWNER_KINDS = new Set(['hero', 'force_card', 'artifact', 'spirit'])

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function desListNonEmpty(raw: unknown): boolean {
  return normalizeDesValueList(raw).some((e) => hasNonEmptyString(e.des))
}

export function classifySkillCompleteness(skill: SkillConfigRow): SkillCompletenessFlags {
  const hasNameKey = hasNonEmptyString(skill.name)
  const hasIconPath = hasNonEmptyString(skill.iconpath)
  const iconUrl = hasIconPath ? resolveSkillIconUrl(skill) : ''
  const hasIconFile = Boolean(iconUrl && isAssetAvailable(iconUrl))
  const hasDes =
    desListNonEmpty(skill.skill_des) ||
    desListNonEmpty(skill.skill_sketch) ||
    desListNonEmpty(skill.awaken_skill_des)
  const desEntries = normalizeDesValueList(skill.skill_des)
  const hasLevels = desEntries.length > 1
  const hasSubSkills = parsePrimitiveList(skill.sub_skills).length > 0

  const hasIcon = hasIconPath
  let completeness: SkillCompleteness
  if (hasNameKey && hasIcon && hasDes) completeness = 'full'
  else if (hasNameKey && hasIcon && !hasDes) completeness = 'name_icon'
  else if (hasNameKey && !hasIcon && hasDes) completeness = 'name_des'
  else if (!hasNameKey && !hasIcon && hasDes) completeness = 'des_only'
  else if (!hasNameKey && hasIcon && !hasDes) completeness = 'icon_only'
  else if (!hasNameKey && hasIcon && hasDes) completeness = 'des_only'
  else if (hasNameKey && !hasIcon && !hasDes) completeness = 'name_icon'
  else completeness = 'empty'

  return {
    hasNameKey,
    hasIconPath,
    hasIconFile,
    hasDes,
    hasLevels,
    hasSubSkills,
    completeness,
  }
}

function hasCatalogOwner(owners: SkillOwner[]): boolean {
  return owners.some((o) => CATALOG_OWNER_KINDS.has(o.type))
}

/**
 * Pass 1 catalog / pass 2 sneak peek / hidden (AA stubs, empty stubs).
 */
export function classifySkillCatalogLayer(
  skill: SkillConfigRow,
  owners: SkillOwner[],
  flags: SkillCompletenessFlags
): SkillCatalogLayer {
  const id = Number(skill.skillid)
  const band = getSkillIdBand(id)

  if (isAutoAttackStub(id) && !flags.hasNameKey && !flags.hasDes) {
    return 'hidden'
  }
  if (flags.completeness === 'empty' && !hasCatalogOwner(owners)) {
    return 'hidden'
  }
  if (band === 'stub' && flags.completeness === 'empty') {
    return 'hidden'
  }

  const catalogOwner = hasCatalogOwner(owners)

  // Pass 1 — catalog
  if (
    flags.completeness === 'full' ||
    flags.completeness === 'name_icon' ||
    flags.completeness === 'name_des' ||
    (flags.completeness === 'des_only' && catalogOwner) ||
    (catalogOwner && (flags.hasNameKey || flags.hasDes))
  ) {
    return 'catalog'
  }

  // Pass 2 — sneak peek (icon-only, WIP, incomplete awakens, etc.)
  if (
    flags.completeness === 'icon_only' ||
    flags.completeness === 'des_only' ||
    flags.hasIconPath ||
    flags.hasNameKey ||
    flags.hasDes ||
    catalogOwner
  ) {
    return 'sneakPeek'
  }

  return 'hidden'
}

export function skillDisplayIconUrl(skill: SkillConfigRow): string {
  const url = resolveSkillIconUrl(skill)
  if (!url) return IMAGE_UNAVAILABLE
  return isAssetAvailable(url) ? url : IMAGE_UNAVAILABLE
}

export type SkillDisplayCopy = {
  noName: string
  noDescription: string
  noIcon: string
}

/** Resolved display name — never raw LC key or bare id as sole title. */
export function skillDisplayName(
  skill: SkillConfigRow,
  getT: (key?: string) => string,
  copy: SkillDisplayCopy
): { text: string; isPlaceholder: boolean } {
  const key = typeof skill.name === 'string' ? skill.name.trim() : ''
  if (!key) return { text: copy.noName, isPlaceholder: true }
  const resolved = getT(key)
  if (!resolved.trim() || resolved === key || resolved.startsWith('LC_')) {
    return { text: copy.noName, isPlaceholder: true }
  }
  return { text: resolved, isPlaceholder: false }
}

export function skillDisplayDesPreview(
  skill: SkillConfigRow,
  getT: (key?: string) => string,
  copy: SkillDisplayCopy,
  valuesMap?: Record<number, (string | number)[]>
): { text: string; isPlaceholder: boolean } {
  const entries = [
    ...normalizeDesValueList(skill.skill_des),
    ...normalizeDesValueList(skill.skill_sketch),
    ...normalizeDesValueList(skill.awaken_skill_des),
  ]
  for (const entry of entries) {
    if (!entry.des) continue
    let resolved = getT(entry.des)
    if (!resolved.trim() || resolved === entry.des || resolved.startsWith('LC_')) continue
    if (valuesMap && entry.value != null) {
      resolved = applySkillValues(resolved, entry.value, valuesMap)
    }
    // strip simple tags for card preview
    const plain = resolved.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (plain) return { text: plain, isPlaceholder: false }
  }
  return { text: copy.noDescription, isPlaceholder: true }
}

export type SkillDisplayedIdentity = {
  /** True when the row already shows a resolved name (skill key or force-card owner). */
  hasName?: boolean
  /** True when the row already shows a real icon (skill path or force-card owner). */
  hasIcon?: boolean
}

export function incompletenessMessages(
  flags: SkillCompletenessFlags,
  copy: SkillDisplayCopy & { noNameYet?: string; noIconYet?: string; noDesYet?: string },
  displayed?: SkillDisplayedIdentity
): string[] {
  const msgs: string[] = []
  const hasName = displayed?.hasName ?? flags.hasNameKey
  const hasIcon = displayed?.hasIcon ?? (flags.hasIconPath && flags.hasIconFile)
  if (!hasName) msgs.push(copy.noNameYet ?? copy.noName)
  if (!hasIcon) msgs.push(copy.noIconYet ?? copy.noIcon)
  if (!flags.hasDes) msgs.push(copy.noDesYet ?? copy.noDescription)
  return msgs
}

export function bandForSkill(skillId: number): SkillIdBand {
  return getSkillIdBand(skillId)
}
