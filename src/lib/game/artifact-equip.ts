import { parseGameData } from '@/lib/game/parse-game-data'
import {
  restrictionIconSrc,
  restrictionLabelKey,
  type ForceCardRestrictionChip,
} from '@/lib/game/force-card-equip'

export type ArtifactLimitCondition = {
  type: string
  value: number[]
}

export type ArtifactRestrictionFilter = 'stance' | 'damagetype' | 'occupation' | 'camp'

const ARTIFACT_RESTRICTION_TYPE_ORDER: Record<string, number> = {
  stance: 0,
  damagetype: 1,
  occupation: 2,
  camp: 3,
  hero_camp: 3,
}

function normalizeArtifactRestrictionType(type: string): ForceCardRestrictionChip['type'] {
  if (type === 'camp') return 'hero_camp'
  if (type === 'stance' || type === 'damagetype' || type === 'occupation' || type === 'hero_sids') {
    return type
  }
  return type as ForceCardRestrictionChip['type']
}

/** DB initial_quality (item frame scale). Display/badge uses DB − 1. */
export function artifactDisplayQuality(dbQuality: number | null | undefined): number {
  return typeof dbQuality === 'number' ? dbQuality - 1 : 0
}

export function artifactFrameQuality(dbQuality: number | null | undefined): number {
  return typeof dbQuality === 'number' ? dbQuality : 0
}

export function parseArtifactLimitConditions(limit: unknown): ArtifactLimitCondition[] {
  const rows: ArtifactLimitCondition[] = []
  for (const row of parseGameData(limit)) {
    // Game format: ["stance", [1, 2, 3]]
    if (Array.isArray(row) && row.length >= 2 && typeof row[0] === 'string') {
      const rawValue = row[1]
      const value = (Array.isArray(rawValue) ? rawValue : [rawValue])
        .map(Number)
        .filter((n) => !Number.isNaN(n))
      if (value.length) rows.push({ type: row[0], value })
      continue
    }

    // Alternate object shape: { type, value }
    if (row && typeof row === 'object') {
      const entry = row as { type?: string; value?: unknown }
      if (!entry.type || !Array.isArray(entry.value) || entry.value.length === 0) continue
      const value = entry.value.map(Number).filter((n) => !Number.isNaN(n))
      if (!value.length) continue
      rows.push({ type: entry.type, value })
    }
  }
  return rows
}

/** Skip generic "all stances/types" limits — same rule as artifact detail header. */
export function isGenericArtifactLimit(entry: ArtifactLimitCondition): boolean {
  return (
    entry.value.length === 3 &&
    entry.value.includes(1) &&
    entry.value.includes(2) &&
    entry.value.includes(3)
  )
}

export function buildArtifactRestrictionChips(
  limit: unknown,
  lang?: string
): ForceCardRestrictionChip[] {
  const chips: ForceCardRestrictionChip[] = []
  for (const entry of parseArtifactLimitConditions(limit)) {
    if (isGenericArtifactLimit(entry)) continue
    for (const objectId of entry.value) {
      chips.push({
        type: normalizeArtifactRestrictionType(entry.type),
        objectId,
        labelKey: restrictionLabelKey(entry.type, objectId),
        iconSrc: restrictionIconSrc(entry.type, objectId, lang),
      })
    }
  }
  return chips
}

export function artifactRestrictionChipKey(chip: ForceCardRestrictionChip): string {
  return `${chip.type}-${chip.objectId}`
}

export function parseArtifactRestrictionChipKey(
  key: string
): { type: ForceCardRestrictionChip['type']; objectId: number } | null {
  const dash = key.indexOf('-')
  if (dash <= 0) return null
  const type = key.slice(0, dash) as ForceCardRestrictionChip['type']
  const objectId = Number(key.slice(dash + 1))
  if (!type || Number.isNaN(objectId)) return null
  return { type, objectId }
}

export function buildArtifactRestrictionChipMap(
  rows: Array<{ id: number; limit?: unknown }>,
  lang?: string
): Map<number, ForceCardRestrictionChip[]> {
  const map = new Map<number, ForceCardRestrictionChip[]>()
  for (const row of rows) {
    const chips = buildArtifactRestrictionChips(row.limit, lang)
    if (chips.length) map.set(row.id, chips)
  }
  return map
}

export function getArtifactRestrictionFilterChips(
  rows: Array<{ id: number; limit?: unknown }>,
  lang?: string
): ForceCardRestrictionChip[] {
  const seen = new Set<string>()
  const options: ForceCardRestrictionChip[] = []

  for (const row of rows) {
    for (const chip of buildArtifactRestrictionChips(row.limit, lang)) {
      if (!chip.iconSrc) continue
      const key = artifactRestrictionChipKey(chip)
      if (seen.has(key)) continue
      seen.add(key)
      options.push(chip)
    }
  }

  return options.sort((a, b) => {
    const orderA = ARTIFACT_RESTRICTION_TYPE_ORDER[a.type] ?? 99
    const orderB = ARTIFACT_RESTRICTION_TYPE_ORDER[b.type] ?? 99
    if (orderA !== orderB) return orderA - orderB
    return a.objectId - b.objectId
  })
}

export function getArtifactRestrictionTypes(limit: unknown): Set<ArtifactRestrictionFilter> {
  const types = new Set<ArtifactRestrictionFilter>()
  for (const chip of buildArtifactRestrictionChips(limit)) {
    const rawType = chip.type === 'hero_camp' ? 'camp' : chip.type
    if (rawType === 'stance' || rawType === 'damagetype' || rawType === 'occupation' || rawType === 'camp') {
      types.add(rawType)
    }
  }
  return types
}

export function artifactHasEquipRestriction(limit: unknown): boolean {
  return getArtifactRestrictionTypes(limit).size > 0
}

export function buildArtifactRestrictionTypeMap(
  rows: Array<{ id: number; limit?: unknown }>
): Map<number, Set<ArtifactRestrictionFilter>> {
  const map = new Map<number, Set<ArtifactRestrictionFilter>>()
  for (const row of rows) {
    const types = getArtifactRestrictionTypes(row.limit)
    if (types.size) map.set(row.id, types)
  }
  return map
}

export function artifactMatchesRestrictionFilter(
  artifactId: number,
  filter: string,
  chipMap: Map<number, ForceCardRestrictionChip[]>
): boolean {
  if (!filter) return true
  const parsed = parseArtifactRestrictionChipKey(filter)
  if (!parsed) return true
  const chips = chipMap.get(artifactId)
  return chips?.some((c) => c.type === parsed.type && c.objectId === parsed.objectId) ?? false
}

export function collectArtifactRestrictionTranslationKeys(limit: unknown): string[] {
  const keys = new Set<string>()
  for (const chip of buildArtifactRestrictionChips(limit)) {
    keys.add(chip.labelKey)
  }
  return Array.from(keys)
}

export function getArtifactRestrictionFilterTypes(
  chipMap: Map<number, ForceCardRestrictionChip[]>
): ArtifactRestrictionFilter[] {
  const types = new Set<ArtifactRestrictionFilter>()
  for (const chips of chipMap.values()) {
    for (const chip of chips) {
      const rawType = chip.type === 'hero_camp' ? 'camp' : chip.type
      if (rawType === 'stance' || rawType === 'damagetype' || rawType === 'occupation' || rawType === 'camp') {
        types.add(rawType)
      }
    }
  }
  return ['stance', 'damagetype', 'occupation', 'camp'].filter((type) =>
    types.has(type as ArtifactRestrictionFilter)
  ) as ArtifactRestrictionFilter[]
}

export type ArtifactStarRow = {
  id: number
  artifact_id: number
  quality: number
  /** ArtifactStarConfig.quality from DB (before display −1). */
  config_quality?: number
  star: number
  consume_num?: number
  exchange_num?: number
  consume_money?: unknown
  consume_item?: unknown
  attribute?: unknown
  skill_up?: unknown
  power_ratio?: number
}

/** Game PropQuality.red (UR). Tiers above this use dsjx_icon_xingxing (ArtifactSkillSmallTipsView). */
export const ARTIFACT_PROP_QUALITY_RED = 6

/** GameDefine.ArtifactQualityString — PropQuality 2–6 (DB initial_quality). */
export const ARTIFACT_QUALITY_LC_KEY: Record<number, string> = {
  2: 'LC_COMMON_quality_N',
  3: 'LC_COMMON_quality_R',
  4: 'LC_COMMON_quality_SR',
  5: 'LC_COMMON_quality_SSR',
  6: 'LC_COMMON_quality_UR',
}

export function artifactQualityLabelKey(propQuality: number): string {
  return ARTIFACT_QUALITY_LC_KEY[propQuality] ?? `LC_COMMON_quality_name_${propQuality}`
}

export function getArtifactQualityBadgeClass(propQuality: number): string {
  const tone: Record<number, string> = {
    2: 'artifact-quality-badge--green',
    3: 'artifact-quality-badge--blue',
    4: 'artifact-quality-badge--purple',
    5: 'artifact-quality-badge--orange',
    6: 'artifact-quality-badge--red',
  }
  return tone[propQuality] ?? 'badge-accent'
}

/** Text tone for ascension rows; advance tiers clamp to UR red (tips view). */
export function artifactAscensionQualityToneClass(configQuality: number): string {
  const tone: Record<number, string> = {
    2: 'artifact-quality-text--green',
    3: 'artifact-quality-text--blue',
    4: 'artifact-quality-text--purple',
    5: 'artifact-quality-text--orange',
    6: 'artifact-quality-text--red',
  }
  const q =
    configQuality > ARTIFACT_PROP_QUALITY_RED ? ARTIFACT_PROP_QUALITY_RED : configQuality
  return tone[q] ?? ''
}

/** Game ArtifactQualityString[PropQuality.red] — used when advance awaken clamps quality label. */
export const ARTIFACT_UR_QUALITY_KEY = 'LC_COMMON_quality_UR'

export function isArtifactAdvanceAwakenStarQuality(configQuality: number): boolean {
  return configQuality > ARTIFACT_PROP_QUALITY_RED
}

/** ArtifactSkillSmallTipsView clamps quality label to UR for advance awaken tiers. */
export function artifactAscensionQualityLabelKey(row: ArtifactStarRow): string {
  const configQuality = row.config_quality ?? row.quality + 1
  if (isArtifactAdvanceAwakenStarQuality(configQuality)) {
    return ARTIFACT_UR_QUALITY_KEY
  }
  return `LC_COMMON_quality_name_${row.quality}`
}

/** ArtifactStarConfig row N stores cost to leave tier N; tier N+1 uses that row unchanged (ArtifactUtil.ArtifactStarConsume). */
export function sortArtifactStarRows(rows: ArtifactStarRow[]): ArtifactStarRow[] {
  return [...rows].sort((a, b) => a.quality - b.quality || a.star - b.star)
}

export function getArtifactTierConsumeSource(
  sortedRows: ArtifactStarRow[],
  tierIndex: number
): ArtifactStarRow | null {
  return tierIndex > 0 ? sortedRows[tierIndex - 1] : null
}
