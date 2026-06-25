/**
 * Item quality frame lookup — port of ItemQualityTypeConfig + ItemQualityConfig (Lua).
 * showType 1 = large bag/detail frames (ty_box_daojukuang*).
 * showType 2 = small consume/award frames (ty_box_xiaodaoju*).
 */
import { getCanonicalAssetPath } from '@/lib/assets/asset-registry'

export const ITEM_QUALITY_SHOW_TYPE = {
  large: 1,
  small: 2,
} as const

export type ItemQualityShowType =
  (typeof ITEM_QUALITY_SHOW_TYPE)[keyof typeof ITEM_QUALITY_SHOW_TYPE]

/** ItemQualityConfig.id → item_bg_name_path (Lua ItemQualityConfig.lua). */
const ITEM_QUALITY_BG_BY_CONFIG_ID: Record<number, string> = {
  1: 'ty_box_daojukuangbai_1',
  2: 'ty_box_daojukuanglv_1',
  3: 'ty_box_daojukuanglan_1',
  4: 'ty_box_daojukuangzi_1',
  5: 'ty_box_daojukuangcheng_1',
  6: 'ty_box_daojukuanghong_1',
  7: 'ty_box_daojukuanghong_1',
  11: 'ty_box_xiaodaojukuangbai_1',
  12: 'ty_box_xiaodaojukuanglv_1',
  13: 'ty_box_xiaodaojukuanglan_1',
  14: 'ty_box_xiaodaojukuangzi_1',
  15: 'ty_box_xiaodaojukuangcheng_1',
  16: 'ty_box_xiaodaojukuanghong_1',
  17: 'ty_box_xiaodaojukuanghong_1',
}

/** ItemQualityTypeConfig type 1 — large frames. */
const TYPE1_QUALITY_TO_CONFIG: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
}

/** ItemQualityTypeConfig type 2 — small frames (default UIItem.mShowType). */
const TYPE2_QUALITY_TO_CONFIG: Record<number, number> = {
  1: 11,
  2: 12,
  3: 13,
  4: 14,
  5: 15,
  6: 16,
  7: 17,
}

function qualityToConfigId(showType: ItemQualityShowType, quality: number): number | null {
  const q = Math.floor(quality)
  if (q <= 0) return null
  const map = showType === ITEM_QUALITY_SHOW_TYPE.large ? TYPE1_QUALITY_TO_CONFIG : TYPE2_QUALITY_TO_CONFIG
  return map[q] ?? null
}

export function resolveItemQualityBgName(
  showType: ItemQualityShowType,
  quality: number
): string | null {
  const configId = qualityToConfigId(showType, quality)
  if (configId == null) return null
  return ITEM_QUALITY_BG_BY_CONFIG_ID[configId] ?? null
}

/** Game loads frames from UI/Sprites/CommonItem; large frames also exist under textures/itemicon. */
export function resolveItemQualityFrameCandidates(bgName: string): string[] {
  return [
    `/assets/resources/ui/sprites/commonitem/${bgName}.png`,
    `/assets/resources/textures/itemicon/${bgName}.png`,
  ]
}

export function resolveItemQualityFramePath(
  showType: ItemQualityShowType,
  quality: number
): { src: string; rawSrc?: string } | null {
  const bgName = resolveItemQualityBgName(showType, quality)
  if (!bgName) return null

  for (const candidate of resolveItemQualityFrameCandidates(bgName)) {
    const canonical = getCanonicalAssetPath(candidate)
    if (canonical) return { src: canonical, rawSrc: canonical }
  }

  const primary = resolveItemQualityFrameCandidates(bgName)[0]
  return { src: primary, rawSrc: primary }
}

export type ItemUiDisplayMode = 'reference' | 'native'

/** Inline chips (consume, materials) — 50% of game native px. */
export const ITEM_UI_SCALE_REFERENCE = 0.5

/** Item catalog listing — full game native px. */
export const ITEM_UI_SCALE_NATIVE = 1

export const ITEM_FRAME_NATIVE_PX = {
  small: { width: 160, height: 160 },
  large: { width: 212, height: 284 },
} as const

/** Display sizes after reference scale (consume / materials). */
export const ITEM_FRAME_PX = {
  small: {
    width: ITEM_FRAME_NATIVE_PX.small.width * ITEM_UI_SCALE_REFERENCE,
    height: ITEM_FRAME_NATIVE_PX.small.height * ITEM_UI_SCALE_REFERENCE,
    icon: 128 * ITEM_UI_SCALE_REFERENCE,
  },
  large: {
    width: ITEM_FRAME_NATIVE_PX.large.width * ITEM_UI_SCALE_REFERENCE,
    height: ITEM_FRAME_NATIVE_PX.large.height * ITEM_UI_SCALE_REFERENCE,
    icon: 128 * ITEM_UI_SCALE_REFERENCE,
  },
} as const

/** @deprecated Prefer `displayMode` on SquareItem or `--item-ui-display-scale`. */
export function itemUiDisplayScale(): number {
  return ITEM_UI_SCALE_REFERENCE
}
