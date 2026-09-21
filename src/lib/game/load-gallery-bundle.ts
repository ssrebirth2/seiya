import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { loadConsumeRefMap } from '@/lib/game/load-consume-ref-map'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { GalleryIndex, GalleryReward } from '@/lib/game/gallery-types'

export type GalleryBundle = GalleryIndex & {
  consumeRefMap: ConsumeRefMap
}

let cachedIndex: GalleryIndex | null = null
let cachedIndexPromise: Promise<GalleryIndex> | null = null

async function fetchGalleryIndex(): Promise<GalleryIndex> {
  if (cachedIndex) return cachedIndex
  if (!cachedIndexPromise) {
    cachedIndexPromise = fetch('/data/gallery-index.json')
      .then(async (res) => {
        if (!res.ok) throw new Error(`gallery-index.json HTTP ${res.status}`)
        const data = (await res.json()) as GalleryIndex
        cachedIndex = data
        return data
      })
      .catch((err) => {
        cachedIndexPromise = null
        throw err
      })
  }
  return cachedIndexPromise
}

function collectRewards(index: GalleryIndex): GalleryReward[] {
  const out: GalleryReward[] = []
  if (index.overall) {
    for (const tier of index.overall.tiers) out.push(...tier.rewards)
  }
  for (const cat of index.categories) {
    for (const tier of cat.tiers) out.push(...tier.rewards)
  }
  for (const entry of index.entries) {
    out.push(...entry.unlockRewards)
  }
  return out
}

export async function loadGalleryBundle(lang: string): Promise<GalleryBundle> {
  const index = await fetchGalleryIndex()
  const seed = collectRewards(index) as ConsumeEntry[]
  const consumeRefMap = await loadConsumeRefMap(seed, lang)
  return { ...index, consumeRefMap }
}
