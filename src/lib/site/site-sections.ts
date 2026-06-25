/**
 * Site section visibility — flip flags here when a section is ready to publish.
 *
 * Items catalog: navigation + consume links follow `ITEMS_SECTION_ENABLED`.
 */
export const ITEMS_SECTION_ENABLED = false

export function itemsCatalogHref(): string | undefined {
  return ITEMS_SECTION_ENABLED ? '/items' : undefined
}

export function itemDetailHref(itemId: number | string | null | undefined): string | undefined {
  if (!ITEMS_SECTION_ENABLED) return undefined
  const id = Number(itemId)
  if (!Number.isFinite(id) || id <= 0) return undefined
  return `/items/${id}`
}
