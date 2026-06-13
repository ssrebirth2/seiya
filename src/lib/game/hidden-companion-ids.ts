/**
 * Companion IDs excluded from the site and from Supabase imports.
 * `npm run configs:import` skips these IDs and purges them from the database.
 *
 * @example
 * export const HIDDEN_COMPANION_IDS: number[] = [8203, 8225]
 */
export const HIDDEN_COMPANION_IDS: number[] = [
  8203
]

const hiddenSet = new Set(HIDDEN_COMPANION_IDS)

export function isCompanionListed(id: number): boolean {
  return !hiddenSet.has(id)
}
