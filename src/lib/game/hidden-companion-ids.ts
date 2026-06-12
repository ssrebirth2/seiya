/**
 * Companion IDs to exclude from the companion list and detail pages.
 * Add numeric IDs here to hide companions from loading and display.
 *
 * @example
 * export const HIDDEN_COMPANION_IDS: number[] = [8203, 8225]
 */
export const HIDDEN_COMPANION_IDS: number[] = [
  8203,
  8225,
  8226,
]

const hiddenSet = new Set(HIDDEN_COMPANION_IDS)

export function isCompanionListed(id: number): boolean {
  return !hiddenSet.has(id)
}
