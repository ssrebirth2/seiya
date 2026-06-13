/**
 * Hero IDs excluded from the site and from Supabase imports.
 * `npm run configs:import` skips these IDs and purges them from the database.
 *
 * @example
 * export const HIDDEN_HERO_IDS: number[] = [101, 205, 999]
 */
export const HIDDEN_HERO_IDS: number[] = [
  1000,1106
]

const hiddenSet = new Set(HIDDEN_HERO_IDS)

export function isHeroListed(id: number): boolean {
  return !hiddenSet.has(id)
}
