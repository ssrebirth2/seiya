/** Figure sid → obj_id / name keys — port of FigureAttributeConfig field layout. */

export function isClothFigureSid(sid: number): boolean {
  return sid >= 9000 && sid < 9500
}

export function isRoleFigureSid(sid: number): boolean {
  return sid >= 9500 && sid < 10000
}

/** ItemConfig / ItemIcon id linked to a figure attribute id. */
export function figureObjIdFromSid(sid: number): number | null {
  if (isClothFigureSid(sid)) return 51000 + (sid - 9000)
  if (isRoleFigureSid(sid)) return 52000 + (sid - 9500)
  return null
}

/** Language key from FigureAttributeConfig.name patterns. */
export function figureNameKeyFromSid(sid: number): string {
  if (isRoleFigureSid(sid)) return `LC_ROLE_role_full_name_${sid - 8500}`
  return `LC_FIGURE_itemname_${sid}`
}

/** Approximate figure_initial_quality when FigureAttributeConfig is unavailable. */
export function figureQualityFromItemQuality(itemQuality?: number | null): number | undefined {
  if (itemQuality == null) return undefined
  const q = Number(itemQuality) - 1
  if (!Number.isFinite(q) || q < 2) return undefined
  return Math.min(5, q)
}
