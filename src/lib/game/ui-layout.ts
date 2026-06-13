/**
 * Unity prefab layouts with paint order from IncludeInfoSquareHeroHead.
 */
import type { CSSProperties } from 'react'
import squareHeroHeadLayout from '../../data/ui-layouts/square-hero-head.json'
import includeInfoLayout from '../../data/ui-layouts/include-info-square-hero-head.json'

export type AbsoluteRect = {
  left: number
  top: number
  width: number
  height: number
}

export type LayoutNode = {
  name: string
  absolute?: AbsoluteRect
  siblingIndex?: number
  parentName?: string | null
  children?: LayoutNode[]
}

export type PrefabLayoutFile = {
  root: string
  layout: {
    root: string
    size?: { width: number; height: number }
    nodesByName?: Record<string, LayoutNode>
  }
}

export const SQUARE_HERO_HEAD = squareHeroHeadLayout as PrefabLayoutFile
export const INCLUDE_INFO_SQUARE_HERO_HEAD = includeInfoLayout as PrefabLayoutFile

/** goTable keys — UISquareHeroItem.lua Init() */
export const SQUARE_HERO_GO = {
  image: 'Image',
  bg: '@_aorimage_bg',
  portrait: '@_aorrawimage_icon',
  qualityBg: '@_obj_qualitybg',
  qualityMask: '@_obj_qualitymask',
  quality: '@_aorimage_quality',
  pos: '@_aorimage_pos',
  camp: '@_aorimage_camp',
  damageType: '@_aorimage_damagetype',
  defenseType: '@_aorimage_defensetype',
  starRoot: '@_obj_starRoot',
  levelMask: '@_obj_namemask',
  levelText: '@_aortext_lv',
} as const

export const INCLUDE_INFO_GO = {
  headSlot: '$_table_SquareHeroHead',
  heroName: '@_aortext_heroName',
} as const

const HEAD_W = 160
const HEAD_H = 160

function getNode(layout: PrefabLayoutFile, name: string): LayoutNode | undefined {
  return layout.layout.nodesByName?.[name]
}

function getAbsolute(layout: PrefabLayoutFile, name: string): AbsoluteRect | undefined {
  return getNode(layout, name)?.absolute
}

/** Paint order for visible layers — siblingIndex from $_table_SquareHeroHead (IncludeInfo prefab). */
export const SQUARE_HERO_PAINT_ORDER: Array<{
  goKey: keyof typeof SQUARE_HERO_GO
  nodeName: string
}> = [
  { goKey: 'qualityBg', nodeName: SQUARE_HERO_GO.qualityBg },
  { goKey: 'bg', nodeName: SQUARE_HERO_GO.bg },
  { goKey: 'portrait', nodeName: SQUARE_HERO_GO.portrait },
  { goKey: 'damageType', nodeName: SQUARE_HERO_GO.damageType },
  { goKey: 'camp', nodeName: SQUARE_HERO_GO.camp },
  { goKey: 'pos', nodeName: SQUARE_HERO_GO.pos },
  { goKey: 'defenseType', nodeName: SQUARE_HERO_GO.defenseType },
  { goKey: 'quality', nodeName: SQUARE_HERO_GO.quality },
  { goKey: 'starRoot', nodeName: SQUARE_HERO_GO.starRoot },
  { goKey: 'levelMask', nodeName: SQUARE_HERO_GO.levelMask },
]

function paintIndex(nodeName: string): number {
  const node = getNode(INCLUDE_INFO_SQUARE_HERO_HEAD, nodeName)
  if (!node) return 0

  const tableName = INCLUDE_INFO_GO.headSlot
  if (node.parentName === tableName) {
    return node.siblingIndex ?? 0
  }

  if (node.parentName) {
    const parentZ = paintIndex(node.parentName)
    // Integer steps only — fractional z-index is ignored by browsers (portrait z=7 covers badge).
    return parentZ + 1 + (node.siblingIndex ?? 0)
  }

  return node.siblingIndex ?? 0
}

export function absoluteToCss(
  rect: AbsoluteRect,
  designW: number,
  designH: number
): CSSProperties {
  return {
    position: 'absolute',
    left: `${(rect.left / designW) * 100}%`,
    top: `${(rect.top / designH) * 100}%`,
    width: `${(rect.width / designW) * 100}%`,
    height: `${(rect.height / designH) * 100}%`,
  }
}

/** Style for a goTable node — z-index from IncludeInfo prefab paint order. */
export function squareHeroGoStyle(goKey: keyof typeof SQUARE_HERO_GO): CSSProperties {
  const nodeName = SQUARE_HERO_GO[goKey]
  const rect = getAbsolute(INCLUDE_INFO_SQUARE_HERO_HEAD, nodeName)
  if (!rect) return { display: 'none' }
  return {
    ...absoluteToCss(rect, HEAD_W, HEAD_H),
    zIndex: paintIndex(nodeName),
  }
}

/** @_obj_qualitymask container — ck_icon at @_aorimage_quality rect. */
export function squareHeroQualityStackStyle(): CSSProperties {
  return squareHeroGoStyle('qualityMask')
}

/** Badge rect relative to @_obj_qualitymask (not head root). */
function squareHeroQualityBadgeRectInMask(): CSSProperties {
  const mask = getAbsolute(INCLUDE_INFO_SQUARE_HERO_HEAD, SQUARE_HERO_GO.qualityMask)
  const badge = getAbsolute(INCLUDE_INFO_SQUARE_HERO_HEAD, SQUARE_HERO_GO.quality)
  if (!mask || !badge) return { display: 'none' }
  return {
    position: 'absolute',
    left: `${((badge.left - mask.left) / mask.width) * 100}%`,
    top: `${((badge.top - mask.top) / mask.height) * 100}%`,
    width: `${(badge.width / mask.width) * 100}%`,
    height: `${(badge.height / mask.height) * 100}%`,
  }
}

export function squareHeroQualityBadgeStyle(): CSSProperties {
  return {
    ...squareHeroQualityBadgeRectInMask(),
    zIndex: 1,
  }
}

/** Above portrait (sibling 7) but below quality mask (sibling 13). */
export function squareHeroTypeIconStyle(goKey: keyof typeof SQUARE_HERO_GO): CSSProperties {
  const base = squareHeroGoStyle(goKey)
  const portraitZ = paintIndex(SQUARE_HERO_GO.portrait)
  const qualityMaskZ = paintIndex(SQUARE_HERO_GO.qualityMask)
  const z = typeof base.zIndex === 'number' ? base.zIndex : 0
  const minZ = portraitZ + 1
  const maxZ = qualityMaskZ - 1
  return { ...base, zIndex: Math.min(Math.max(z, minZ), maxZ) }
}

export function includeInfoGoStyle(goKey: keyof typeof INCLUDE_INFO_GO): CSSProperties {
  const nodeName = INCLUDE_INFO_GO[goKey]
  const rect = getAbsolute(INCLUDE_INFO_SQUARE_HERO_HEAD, nodeName)
  if (!rect) return {}
  const canvasH = includeInfoCanvasHeight()
  return absoluteToCss(rect, HEAD_W, canvasH)
}

export function includeInfoCanvasHeight(): number {
  const nameRect = getAbsolute(INCLUDE_INFO_SQUARE_HERO_HEAD, INCLUDE_INFO_GO.heroName)
  if (!nameRect) return HEAD_H
  return Math.ceil(nameRect.top + nameRect.height)
}

export function includeInfoRootStyle(options?: { headOnly?: boolean }): CSSProperties {
  const canvasH = options?.headOnly ? HEAD_H : includeInfoCanvasHeight()
  return {
    position: 'relative',
    aspectRatio: `${HEAD_W} / ${canvasH}`,
    marginInline: 'auto',
    flexShrink: 0,
  }
}

export function squareHeroHeadSlotStyle(options?: { headOnly?: boolean }): CSSProperties {
  const canvasH = options?.headOnly ? HEAD_H : includeInfoCanvasHeight()
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: `${(HEAD_H / canvasH) * 100}%`,
  }
}

export function squareHeroHeadDesignSize(): number {
  return HEAD_W
}
