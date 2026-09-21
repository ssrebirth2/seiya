/**
 * Site section visibility — flip flags here when a section is ready to publish.
 *
 * Items / skills catalogs: navigation + consume links follow these flags.
 */
export const ITEMS_SECTION_ENABLED = true
export const SKILLS_SECTION_ENABLED = true
export const GALLERY_SECTION_ENABLED = true

export function itemsCatalogHref(): string | undefined {
  return ITEMS_SECTION_ENABLED ? '/items' : undefined
}

export function itemDetailHref(itemId: number | string | null | undefined): string | undefined {
  if (!ITEMS_SECTION_ENABLED) return undefined
  const id = Number(itemId)
  if (!Number.isFinite(id) || id <= 0) return undefined
  return `/items/${id}`
}

export function skillsCatalogHref(): string | undefined {
  return SKILLS_SECTION_ENABLED ? '/skills' : undefined
}

export function skillDetailHref(skillId: number | string | null | undefined): string | undefined {
  if (!SKILLS_SECTION_ENABLED) return undefined
  const id = Number(skillId)
  if (!Number.isFinite(id) || id <= 0) return undefined
  return `/skills?open=${id}`
}

export function galleryHref(): string | undefined {
  return GALLERY_SECTION_ENABLED ? '/gallery' : undefined
}

export function consumeDetailHref(entry: {
  type?: string
  sid?: number | null
}): string | undefined {
  const id = Number(entry.sid)
  if (!Number.isFinite(id) || id <= 0) return undefined

  switch (entry.type) {
    case 'artifact':
      return `/artifacts/${id}`
    case 'hero':
      return `/heroes/${id}`
    case 'spirit':
      return `/companions/${id}`
    case 'force_card':
      return `/force-cards/${id}`
    case 'prop':
      return itemDetailHref(id)
    case 'skill':
      return skillDetailHref(id)
    default:
      return undefined
  }
}
