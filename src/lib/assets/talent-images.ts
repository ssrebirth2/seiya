import { getCanonicalAssetPath, isAssetMarkedMissing } from './asset-registry'

/** Same size as hero skill icons (HeroSkillList). */
export const TALENT_ICON_CLASS = 'h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20'

/**
 * In-game giftedness point icons: tfxt_icon_shuxingdian_{1-5}
 * Files live in public/assets/resources/textures/hero/talent/
 */
function talentPointCandidates(index: number): string[] {
  const n = Math.min(5, Math.max(1, index))
  return [
    `/assets/resources/textures/hero/talent/tfxt_icon_shuxingdian_${n}.png`,
    `/assets/resources/textures/hero/talent/talent_point_${n}.png`,
  ]
}

/** Public URL for a talent point icon (served from /public, no manifest gate). */
export function talentPointIconPath(index: number): string {
  const candidates = talentPointCandidates(index)
  for (const p of candidates) {
    const canonical = getCanonicalAssetPath(p)
    if (canonical && !isAssetMarkedMissing(canonical)) return canonical
  }
  return candidates[0]
}

/** @deprecated use talentPointIconPath — kept for callers expecting this name */
export function talentPointIconUrl(index: number): string {
  return talentPointIconPath(index)
}

/** @deprecated use talentPointIconPath */
export function talentPointIconRaw(index: number): string {
  return talentPointIconPath(index)
}
