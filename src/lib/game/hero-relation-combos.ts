import { supabase } from '@/lib/supabase-client'

export type HeroRelationComboRow = Record<string, unknown> & {
  id: number
  name?: string
  hero_id?: number
  hero_list?: unknown
  skill_id?: number
  type?: number
}

function parseJsonList(v: unknown): unknown[] {
  if (!v) return []
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    const trimmed = v.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    if (/^\d+(,\d+)*$/.test(trimmed)) {
      return trimmed.split(',').map((part) => Number(part.trim()))
    }
  }
  return []
}

/** Hero IDs from hero_list / condition columns (numbers or numeric strings). */
export function parseHeroRelationHeroIds(v: unknown): number[] {
  return parseJsonList(v)
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)
}

export function heroListIncludesHero(row: HeroRelationComboRow, heroId: number): boolean {
  return parseHeroRelationHeroIds(row.hero_list).includes(heroId)
}

/** Every HeroRelationSkillConfig id referenced as a launcher combo skill. */
export async function fetchLauncherComboSkillIds(): Promise<Set<number>> {
  const { data, error } = await supabase.from('HeroRelationConfig').select('combine_skill_list')
  if (error) {
    console.error('fetchLauncherComboSkillIds failed:', error.message)
    return new Set()
  }

  const ids = new Set<number>()
  for (const rel of data ?? []) {
    parseHeroRelationHeroIds(rel.combine_skill_list).forEach((id) => ids.add(id))
  }
  return ids
}

/** Combo skill rows where heroId is a required partner, not the launcher. */
export function filterPartnerComboSkills(
  rows: HeroRelationComboRow[],
  heroId: number,
  launcherComboIds: Set<number>
): HeroRelationComboRow[] {
  return rows.filter((row) => {
    if (!launcherComboIds.has(row.id)) return false
    if (!row.skill_id) return false

    const launcherId = Number(row.hero_id)
    if (!Number.isFinite(launcherId) || launcherId <= 0 || launcherId === heroId) return false

    return heroListIncludesHero(row, heroId)
  })
}

export async function fetchHeroRelationComboRows(): Promise<HeroRelationComboRow[]> {
  const { data, error } = await supabase.from('HeroRelationSkillConfig').select('*')
  if (error) {
    console.error('fetchHeroRelationComboRows failed:', error.message)
    return []
  }
  return (data ?? []) as HeroRelationComboRow[]
}

export async function fetchPartnerComboSkillsForHero(
  heroId: number
): Promise<HeroRelationComboRow[]> {
  const [allRows, launcherComboIds] = await Promise.all([
    fetchHeroRelationComboRows(),
    fetchLauncherComboSkillIds(),
  ])
  return filterPartnerComboSkills(allRows, heroId, launcherComboIds)
}
