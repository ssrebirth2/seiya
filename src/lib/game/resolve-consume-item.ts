import { resolveItemIconBySid } from '@/lib/assets/game-images'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/asset-registry'
import type { ConsumeRefMap, ConsumeRefEntity } from '@/lib/game/load-hero-talents-bundle'
import { consumeRefKey } from '@/lib/game/load-hero-talents-bundle'
import {
  ITEM_QUALITY_SHOW_TYPE,
  resolveItemQualityFramePath,
  type ItemQualityShowType,
} from '@/lib/game/item-quality-ui'
import { itemIconUrl, resolveItemIconPath } from '@/lib/game/resolve-item-icon'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { itemDetailHref } from '@/lib/site/site-sections'

export type ResolvedConsumeItem = {
  nameKey: string
  name: string
  iconUrl: string
  iconRawSrc?: string
  quality: number
  frameSrc?: string
  frameRawSrc?: string
  href?: string
  awardKind: 'prop' | 'money' | 'other'
}

export function resolveConsumeIcon(
  iconPath?: string | null,
  sid?: number | null
): { iconUrl: string; iconRawSrc?: string } {
  if (iconPath) {
    const fromPath = resolveItemIconPath(iconPath)
    if (fromPath) return { iconUrl: fromPath, iconRawSrc: fromPath }
  }
  if (sid != null) {
    const bySid = resolveItemIconBySid(sid)
    if (bySid.rawSrc) return { iconUrl: bySid.src, iconRawSrc: bySid.rawSrc }
  }
  const fallback = itemIconUrl(null)
  return { iconUrl: fallback, iconRawSrc: fallback !== IMAGE_UNAVAILABLE ? fallback : undefined }
}

export function resolveConsumeFromRef(
  entry: ConsumeEntry,
  ref: ConsumeRefEntity | undefined,
  showType: ItemQualityShowType = ITEM_QUALITY_SHOW_TYPE.small
): ResolvedConsumeItem {
  const quality = ref?.quality ?? 0
  const frame = quality > 0 ? resolveItemQualityFramePath(showType, quality) : null
  const icon = resolveConsumeIcon(ref?.iconPath, entry.sid)
  const name = ref?.name ?? (entry.sid ? `#${entry.sid}` : entry.type || 'Unknown')
  const nameKey = ref?.nameKey ?? name
  const awardKind: ResolvedConsumeItem['awardKind'] =
    entry.type && entry.type !== 'prop' ? 'money' : entry.sid ? 'prop' : 'other'

  return {
    nameKey,
    name,
    iconUrl: icon.iconUrl,
    iconRawSrc: icon.iconRawSrc,
    quality,
    frameSrc: frame?.src,
    frameRawSrc: frame?.rawSrc,
    href: itemDetailHref(entry.sid),
    awardKind,
  }
}

export function resolveConsumeEntry(
  entry: ConsumeEntry,
  consumeRefMap: ConsumeRefMap,
  showType: ItemQualityShowType = ITEM_QUALITY_SHOW_TYPE.small
): ResolvedConsumeItem {
  const ref = consumeRefMap[consumeRefKey(entry)]
  return resolveConsumeFromRef(entry, ref, showType)
}
