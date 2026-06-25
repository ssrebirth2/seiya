/**
 * Port of GameDefine Dynamis* tables (GameDefine.lua ~8833).
 * Consumed via CSS custom properties — no hex in TSX components.
 */
import type { CSSProperties } from 'react'

/** GameDefine.DynamisQuality — texture paths relative to Textures/ */
export const DYNAMIS_QUALITY_FRAME: Record<number, string> = {
  1: 'Textures/Dynamis/jjzl_box_kapaikuang_1',
  2: 'Textures/Dynamis/jjzl_box_kapaikuang_2',
  3: 'Textures/Dynamis/jjzl_box_kapaikuang_3',
  4: 'Textures/Dynamis/jjzl_box_kapaikuang_4',
  5: 'Textures/Dynamis/jjzl_box_kapaikuang_5',
  6: 'Textures/Dynamis/jjzl_box_kapaikuang_6',
}

/** GameDefine.DynamisLevelBg — sprite names in UI/Sprites/Dynamis atlas */
export const DYNAMIS_LEVEL_BADGE_SPRITE: Record<number, string> = {
  2: 'jjzl_box_djk_2',
  3: 'jjzl_box_djk_3',
  4: 'jjzl_box_djk_4',
  5: 'jjzl_box_djk_5',
  6: 'jjzl_box_djk_6',
}

/** GameDefine.DynamisNameColor */
export const DYNAMIS_NAME_COLOR: Record<number, string> = {
  1: '#ffffff',
  2: '#83e496',
  3: '#7caaff',
  4: '#bf9af7',
  5: '#f59f3a',
  6: '#ff655b',
}

/** GameDefine.DynamisLevelOutLineColor */
export const DYNAMIS_LEVEL_OUTLINE_COLOR: Record<number, string> = {
  1: '#535353',
  2: '#487d7f',
  3: '#59649c',
  4: '#76679d',
  5: '#8a5d35',
  6: '#975034',
}

function parseGradientPair(raw: string | undefined): { from: string; to: string } | null {
  if (!raw) return null
  const [from, to] = raw.split('_')
  if (!from || !to) return null
  return { from, to }
}

/** GameDefine.DynamisLevelColor — "from_to" gradient for level/name text */
export function getDynamisLevelGradient(quality: number): { from: string; to: string } | null {
  const table: Record<number, string> = {
    1: '#ffffff_#ffffff',
    2: '#ffffff_#d0feff',
    3: '#ffffff_#dcf2ff',
    4: '#ffffff_#e8dfff',
    5: '#ffffff_#8a5d35',
    6: '#ffffff_#ffddc4',
  }
  return parseGradientPair(table[quality])
}

/** GalleryDynamisView.lua toggleTypes — force card tiers by color name, not R/SR/SSR/UR */
export const FORCE_CARD_QUALITY_LC_KEY: Record<number, string> = {
  2: 'LC_Dynamis_Green',
  3: 'LC_Dynamis_Blue',
  4: 'LC_Dynamis_Purple',
  5: 'LC_Dynamis_Orange',
  6: 'LC_Dynamis_Red',
}

/** CSS hook for catalog glow / filter pills — maps PropQuality tier to color token */
/** jjzl_box_kapaikuang_* frame (448×692) with Card_* art (424×612) top-aligned inside. */
export const FORCE_CARD_FRAME_SIZE = { width: 448, height: 692 } as const
export const FORCE_CARD_ART_SIZE = { width: 424, height: 612 } as const

export function getForceCardArtFrameInset(): CSSProperties {
  const { width: fw, height: fh } = FORCE_CARD_FRAME_SIZE
  const { width: aw, height: ah } = FORCE_CARD_ART_SIZE
  return {
    top: 0,
    left: `${((fw - aw) / 2 / fw) * 100}%`,
    width: `${(aw / fw) * 100}%`,
    height: `${(ah / fh) * 100}%`,
  }
}

export function getForceCardQualityToneClass(quality: number): string {
  const tone: Record<number, string> = {
    2: 'force-card-quality-tone--green',
    3: 'force-card-quality-tone--blue',
    4: 'force-card-quality-tone--purple',
    5: 'force-card-quality-tone--orange',
    6: 'force-card-quality-tone--red',
  }
  return tone[quality] ?? ''
}

export function getDynamisNameStyle(quality: number): CSSProperties {
  const color = DYNAMIS_NAME_COLOR[quality]
  const gradient = getDynamisLevelGradient(quality)
  const outline = DYNAMIS_LEVEL_OUTLINE_COLOR[quality]

  const style: CSSProperties & Record<string, string> = {}
  if (color) style.color = color
  if (outline) style['--dynamis-name-outline'] = outline
  if (gradient) {
    style['--dynamis-name-gradient-from'] = gradient.from
    style['--dynamis-name-gradient-to'] = gradient.to
  }
  return style
}
