import type { ConsumeEntry } from '@/lib/game/parse-game-data'

export type GalleryReward = ConsumeEntry

export type GalleryCondition = {
  descKey: string | null
  objectId: number | null
  type: string | null
  value: unknown
  /** LC key for placeholder {0} (hero/task chapter/figure name, …). */
  arg0Key?: string | null
  /** LC key for placeholder {1} (task name, …). */
  arg1Key?: string | null
  /** Literal for {1} when not an LC key (level, uv threshold, …). */
  arg1Literal?: string | null
}

export type GalleryTier = {
  step: number
  levelId: number
  exp: number | null
  sumExp: number
  awardId: number | null
  rewards: GalleryReward[]
  titleKey: string | null
  isCap: boolean
}

export type GalleryCategory = {
  id: number
  type: string
  labelKey: string
  levelList: number[]
  chinaAreaKeyId: number | null
  entryIds: number[]
  tiers: GalleryTier[]
  hasLevelTrack: boolean
  maxExp: number
  entryCount: number
  totalEntryExp: number
}

export type GalleryEntry = {
  id: number
  sort: number
  objectId: number
  exp: number
  awardId: number | null
  unlockRewards: GalleryReward[]
  descKey: string | null
  conditions: GalleryCondition[]
  categoryType: string
  /** Game Textures/... path from Lua (no extension). */
  thumbPath?: string | null
  /** LC key for the object display name (hero, cloth, etc.). */
  nameKey?: string | null
}

export type GalleryTotals = {
  entryCount: number
  totalEntryExp: number
  unlockRmb: number
  unlockGold: number
  tierRmb: number
  tierGold: number
  totalRmb: number
  totalGold: number
}

export type GalleryIndex = {
  region: string
  overall: GalleryCategory | null
  categories: GalleryCategory[]
  entries: GalleryEntry[]
  totals: GalleryTotals
}

/** Entry object_id → site route when a catalog page exists. */
export function galleryEntryHref(entry: GalleryEntry): string | undefined {
  const id = entry.objectId
  if (!Number.isFinite(id) || id <= 0) return undefined
  switch (entry.categoryType) {
    case 'gallery_hero':
      return `/heroes/${id}`
    case 'gallery_artifact':
      return `/artifacts/${id}`
    case 'gallery_spirit':
      return `/companions/${id}`
    case 'gallery_force_card':
      return `/force-cards/${id}`
    default:
      return undefined
  }
}
