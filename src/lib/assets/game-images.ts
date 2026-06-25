import {
  getCanonicalAssetPath,
  IMAGE_UNAVAILABLE,
  isAssetAvailable,
  resolveAssetUrl,
} from './asset-registry'

export { IMAGE_UNAVAILABLE }

import {
  getHeroCircleHeadUrl,
  getHeroSquareHeadUrl,
  type HeroHeadIconMap,
} from '@/lib/game/fetch-hero-head-icons'

/** Square head from IconConfig.role_square_icon_path (via hero icon map), with legacy fallback. */
export function squareHeroHeadUrl(heroId: number, iconMap?: HeroHeadIconMap): string {
  return getHeroSquareHeadUrl(iconMap, heroId)
}

/** Circle head from IconConfig.role_circle_icon_path (via hero icon map), with legacy fallback. */
export function circleHeroHeadUrl(heroId: number, iconMap?: HeroHeadIconMap): string {
  return getHeroCircleHeadUrl(iconMap, heroId)
}

export function superSkillBannerPath(heroId: number): string {
  return `/assets/resources/textures/hero/skillicon/skillbanner/SuperSkill_${heroId}0.png`
}

export function superSkillBannerUrl(heroId: number): string {
  return resolveAssetUrl(superSkillBannerPath(heroId))
}

/**
 * When DB `preview_icon` name differs from the file on disk — per artifact ID only.
 * Do not use global filename aliases (many IDs share placeholder keys in Supabase).
 */
const ARTIFACT_PREVIEW_ID_OVERRIDES: Record<number, string> = {
  4006: '/assets/resources/textures/artifact/artifactshowview/virgo_beads.png',
}

/**
 * Supabase `preview_icon` → manifest path (case-insensitive).
 * Returns undefined when no matching file exists — never substitutes another image.
 */
function artifactPreviewPathFromDb(dbPath: string): string | undefined {
  let relative = dbPath.replace(/^Textures\//i, '').replace(/\\/g, '/')

  const spiritMatch = relative.match(/^PrimarySpirit\/Spirit\/(ItemIcon_\d+)$/i)
  if (spiritMatch) {
    relative = `itemicon/${spiritMatch[1]}`
  } else {
    relative = relative.toLowerCase()
  }

  const candidate = `/assets/resources/textures/${relative}.png`
  return getCanonicalAssetPath(candidate)
}

/**
 * Artifact preview from Supabase `preview_icon` only (ArtifactShowView).
 * Exact manifest match per item — placeholder when the file does not exist.
 */
export function resolveArtifactPreviewAsset(
  dbPreviewPath?: string | null,
  artifactId?: number
): { src: string; rawSrc?: string } {
  if (artifactId != null && ARTIFACT_PREVIEW_ID_OVERRIDES[artifactId]) {
    const override = ARTIFACT_PREVIEW_ID_OVERRIDES[artifactId]
    const src = resolveAssetUrl(override)
    return { src, rawSrc: src !== IMAGE_UNAVAILABLE ? override : undefined }
  }

  if (!dbPreviewPath) return { src: IMAGE_UNAVAILABLE }

  const previewPath = artifactPreviewPathFromDb(dbPreviewPath)
  if (!previewPath) return { src: IMAGE_UNAVAILABLE }

  return { src: previewPath, rawSrc: previewPath }
}

function forceCardSmallPath(cardId: number): string {
  return `/assets/resources/textures/dynamis/card/Card_small_${cardId}.png`
}

/** List thumbnail: Card_small when listed, else generic icon, else placeholder — no 404. */
export function resolveForceCardListIcon(cardId: number, hasIconPath: boolean): {
  src: string
  rawSrc?: string
} {
  if (hasIconPath) {
    const path = forceCardSmallPath(cardId)
    if (isAssetAvailable(path)) return { src: path, rawSrc: path }
  }

  const fallback = '/assets/resources/textures/dynamis/card/ItemIcon_10000.png'
  return {
    src: resolveAssetUrl(fallback),
    rawSrc: isAssetAvailable(fallback) ? fallback : undefined,
  }
}

function forceCardPath(cardId: number): string {
  return `/assets/resources/textures/dynamis/card/Card_${cardId}.png`
}

function forceCardFramePath(quality: number): string {
  return `/assets/resources/textures/dynamis/jjzl_box_kapaikuang_${quality}.png`
}

function dynamisLevelBadgePath(spriteName: string): string {
  return `/assets/resources/ui/sprites/dynamis/${spriteName}.png`
}

/** Level badge sprite jjzl_box_djk_{quality} — manifest only. */
export function resolveForceCardLevelBadge(quality?: number): {
  src: string
  rawSrc?: string
} {
  if (quality == null) return { src: IMAGE_UNAVAILABLE }
  const spriteName = `jjzl_box_djk_${quality}`
  const path = dynamisLevelBadgePath(spriteName)
  if (isAssetAvailable(path)) return { src: path, rawSrc: path }
  return { src: IMAGE_UNAVAILABLE }
}

/** Detail view: card art and optional frame, manifest-only. */
export function resolveForceCardDisplayAsset(
  cardId: number,
  quality?: number
): { cardSrc: string; cardRaw?: string; frameSrc?: string; frameRaw?: string } {
  const cardPath = forceCardPath(cardId)
  const cardListed = isAssetAvailable(cardPath)
  const cardSrc = resolveAssetUrl(cardPath)

  let frameSrc: string | undefined
  let frameRaw: string | undefined
  if (cardListed && quality != null) {
    const framePath = forceCardFramePath(quality)
    if (isAssetAvailable(framePath)) {
      frameSrc = framePath
      frameRaw = framePath
    }
  }

  return {
    cardSrc,
    cardRaw: cardListed ? cardPath : undefined,
    frameSrc,
    frameRaw,
  }
}

/** Item list icon from sid — manifest only. */
export function resolveItemIconBySid(sid?: number | null): { src: string; rawSrc?: string } {
  if (sid == null) return { src: IMAGE_UNAVAILABLE }
  const path = `/assets/resources/textures/itemicon/ItemIcon_${sid}.png`
  if (isAssetAvailable(path)) return { src: path, rawSrc: path }
  return { src: IMAGE_UNAVAILABLE }
}

/** Normalize Supabase texture path → site-relative path (no extension). */
function texturePathFromDb(dbPath: string): string {
  const relative = dbPath.replace(/^Textures\//i, '').replace(/\\/g, '/').toLowerCase()
  return `/assets/resources/textures/${relative}.png`
}

/** Companion gallery preview — preserves PrimarySpirit/Spirit/ path from game. */
function companionPreviewPathFromDb(dbPath: string): string | undefined {
  return getCanonicalAssetPath(texturePathFromDb(dbPath))
}

/** Companion list icon — ItemIcon from ArtifactResourcesConfig.item_icon. */
function companionListIconPathFromDb(dbPath: string): string | undefined {
  return getCanonicalAssetPath(texturePathFromDb(dbPath))
}

/** Fallback when ArtifactResourcesConfig.preview_icon is missing (skins 82010 → ItemIcon_128010). */
function companionPreviewPathFromSkins(skinsId: number): string {
  const iconName = `ItemIcon_${String(skinsId).replace(/^82/, '128')}`
  return `/assets/resources/textures/primaryspirit/spirit/${iconName}.png`
}

export function resolveCompanionPreviewAsset(
  dbPreviewPath?: string | null,
  skinsId?: number | null
): { src: string; rawSrc?: string } {
  if (dbPreviewPath) {
    const previewPath = companionPreviewPathFromDb(dbPreviewPath)
    if (previewPath) return { src: previewPath, rawSrc: previewPath }
  }
  if (skinsId != null) {
    const fallbackPath = companionPreviewPathFromSkins(skinsId)
    const canonical = getCanonicalAssetPath(fallbackPath)
    if (canonical) return { src: canonical, rawSrc: canonical }
  }
  return { src: IMAGE_UNAVAILABLE }
}

export function resolveCompanionListIcon(
  dbItemIconPath?: string | null
): { src: string; rawSrc?: string } {
  if (!dbItemIconPath) return { src: IMAGE_UNAVAILABLE }
  const iconPath = companionListIconPathFromDb(dbItemIconPath)
  if (!iconPath) return { src: IMAGE_UNAVAILABLE }
  return { src: iconPath, rawSrc: iconPath }
}
