/**
 * Item IDs excluded from the site catalog, detail pages, and Supabase imports.
 * `npm run configs:import` skips these IDs and purges them from the database.
 *
 * @example
 * export const HIDDEN_ITEM_IDS: number[] = [99999, 100001]
 */
export const HIDDEN_ITEM_IDS: number[] = [35024, 35018, 35025, 35026, 35028, 35029, 35007, 35006, 35005, 35004, 35003, 35002, 30011, 30012, 30014, 30015, 35000, 35001, 30000, 20000, 10022, 10021, 10020, 10000, 25041, 25031]

const hiddenSet = new Set(HIDDEN_ITEM_IDS)

export function isItemListed(id: number): boolean {
  return Number.isFinite(id) && !hiddenSet.has(id)
}
