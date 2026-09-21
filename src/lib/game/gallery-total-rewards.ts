import type { GalleryCategory, GalleryEntry, GalleryReward } from '@/lib/game/gallery-types'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'

function rewardKey(r: GalleryReward): string {
  return `${r.type ?? 'prop'}:${r.sid ?? 0}`
}

function rewardRank(e: ConsumeEntry): number {
  if (e.type === 'rmb') return 0
  if (e.type === 'role_money') return 1
  if (!e.type || e.type === 'prop') return 2
  return 3
}

/**
 * Aggregate claimable gallery rewards for the totals strip.
 * Mirrors build-gallery-index totals: entry unlock awards + non-cap progress tiers
 * (overall + per-category tracks). Skips num≤0 cosmetics (frames/titles).
 */
export function aggregateGalleryTotalRewards(opts: {
  overall: GalleryCategory | null
  categories: GalleryCategory[]
  entries: GalleryEntry[]
}): ConsumeEntry[] {
  const map = new Map<string, ConsumeEntry>()

  const add = (r: GalleryReward) => {
    const num = Number(r.num) || 0
    if (num <= 0) return
    const key = rewardKey(r)
    const prev = map.get(key)
    if (prev) {
      map.set(key, { ...prev, num: prev.num + num })
      return
    }
    map.set(key, {
      num,
      type: r.type,
      sid: r.sid,
      quality: r.quality,
      star: r.star,
    })
  }

  for (const entry of opts.entries) {
    for (const r of entry.unlockRewards) add(r)
  }

  const tracks = [...(opts.overall ? [opts.overall] : []), ...opts.categories]
  for (const cat of tracks) {
    for (const tier of cat.tiers) {
      if (tier.isCap) continue
      for (const r of tier.rewards) add(r)
    }
  }

  return [...map.values()].sort(
    (a, b) => rewardRank(a) - rewardRank(b) || (a.sid ?? 0) - (b.sid ?? 0)
  )
}
