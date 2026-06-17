/**
 * Force card IDs excluded from the site and from Supabase imports.
 * `npm run configs:import` skips these IDs and purges them from the database.
 *
 * @example
 * export const HIDDEN_FORCE_CARD_IDS: number[] = [93018, 94001]
 */
export const HIDDEN_FORCE_CARD_IDS: number[] = [89998, 89999]

const hiddenSet = new Set(HIDDEN_FORCE_CARD_IDS)

export function isForceCardListed(id: number): boolean {
  return !hiddenSet.has(id)
}
