'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/context/language-context'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { consumeRefKey } from '@/lib/game/load-hero-talents-bundle'
import { loadConsumeRefMap } from '@/lib/game/load-consume-ref-map'

const entityCache = new Map<string, import('@/lib/game/load-hero-talents-bundle').ConsumeRefEntity>()
const inflightBuilds = new Map<string, Promise<ConsumeRefMap>>()

function entityCacheKey(lang: string, entry: ConsumeEntry): string {
  return `${lang}|${consumeRefKey(entry)}`
}

function buildMapCacheKey(lang: string, entries: ConsumeEntry[]): string {
  const uniqueKeys = [...new Set(entries.map(consumeRefKey))].sort().join('|')
  return `${lang}|${uniqueKeys}`
}

function getCachedConsumeRefMap(lang: string, entries: ConsumeEntry[]): ConsumeRefMap | null {
  if (!entries.length) return {}

  const map: ConsumeRefMap = {}
  for (const entry of entries) {
    const cached = entityCache.get(entityCacheKey(lang, entry))
    if (!cached) return null
    map[consumeRefKey(entry)] = cached
  }
  return map
}

function cacheEntities(lang: string, entries: ConsumeEntry[], map: ConsumeRefMap): void {
  for (const entry of entries) {
    const key = consumeRefKey(entry)
    const entity = map[key]
    if (entity) entityCache.set(entityCacheKey(lang, entry), entity)
  }
}

async function buildConsumeRefMap(entries: ConsumeEntry[], lang: string): Promise<ConsumeRefMap> {
  const cached = getCachedConsumeRefMap(lang, entries)
  if (cached) return cached

  const uniqueEntries = [...new Map(entries.map((entry) => [consumeRefKey(entry), entry])).values()]
  const missingEntries = uniqueEntries.filter((entry) => !entityCache.has(entityCacheKey(lang, entry)))

  const map: ConsumeRefMap = {}
  for (const entry of uniqueEntries) {
    const cachedEntity = entityCache.get(entityCacheKey(lang, entry))
    if (cachedEntity) map[consumeRefKey(entry)] = cachedEntity
  }

  if (!missingEntries.length) return map

  const loaded = await loadConsumeRefMap(missingEntries, lang)
  Object.assign(map, loaded)
  cacheEntities(lang, uniqueEntries, map)
  return map
}

/** Stable empty list for callers that skip internal consume loading. */
export const EMPTY_CONSUME_ENTRIES: ConsumeEntry[] = []

export function useConsumeRefMap(entries: ConsumeEntry[]) {
  const { lang } = useLanguage()

  const entriesKey =
    entries.length > 0
      ? [...new Set(entries.map(consumeRefKey))].sort().join('|')
      : ''

  const [consumeRefMap, setConsumeRefMap] = useState<ConsumeRefMap>(
    () => getCachedConsumeRefMap(lang, entries) ?? {}
  )
  const [ready, setReady] = useState(
    () => entries.length === 0 || getCachedConsumeRefMap(lang, entries) != null
  )

  useEffect(() => {
    if (!entriesKey) return

    let cancelled = false

    const cached = getCachedConsumeRefMap(lang, entries)
    if (cached) {
      setConsumeRefMap(cached)
      setReady(true)
      return
    }

    const buildKey = buildMapCacheKey(lang, entries)
    let promise = inflightBuilds.get(buildKey)
    if (!promise) {
      promise = buildConsumeRefMap(entries, lang).finally(() => {
        inflightBuilds.delete(buildKey)
      })
      inflightBuilds.set(buildKey, promise)
    }

    promise.then((map) => {
      if (!cancelled) {
        setConsumeRefMap(map)
        setReady(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [lang, entriesKey])

  return { consumeRefMap, ready }
}

/** Preload consume icon/name refs (e.g. before detail page paint). Uses module cache. */
export async function preloadConsumeRefMap(
  entries: ConsumeEntry[],
  lang: string
): Promise<ConsumeRefMap> {
  if (!entries.length) return {}
  return buildConsumeRefMap(entries, lang)
}
