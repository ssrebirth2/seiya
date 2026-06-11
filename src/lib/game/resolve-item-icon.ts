const FALLBACK_ITEM_ICON = '/assets/resources/textures/itemicon/itemicon_10000.png'

/** Supabase icon_path → public asset URL (itemicon directory). */
export function resolveItemIconPath(raw?: string | null): string | null {
  if (!raw) return null
  const cleaned = raw.replace(/^Textures\//i, '').replace(/\.png$/i, '')
  return `/assets/resources/textures/${cleaned.toLowerCase()}.png`
}

export function itemIconUrl(raw?: string | null): string {
  return resolveItemIconPath(raw) ?? FALLBACK_ITEM_ICON
}

export { FALLBACK_ITEM_ICON }
