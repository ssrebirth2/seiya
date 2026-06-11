/**
 * Hero IDs to exclude from the hero list page.
 * Add numeric IDs here to hide heroes from loading and display.
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
