// lib/translate.ts — cache único para LanguagePackage_* (translateKeys + preloadTranslations + useTranslation)
import { supabase } from '@/lib/supabase-client'
import { NO_DATA_LC_KEY } from './ui-keys'

const translationCache: Record<string, Record<string, string>> = {}
const CHUNK_SIZE = 200
/** Browsers cap ~6 concurrent connections per host; unbounded chunk fan-out causes Failed to fetch. */
const MAX_CONCURRENT_CHUNKS = 4
const FALLBACK_LANG = 'CN'
const inflightChunks = new Map<string, Promise<void>>()
const FALLBACK_NOT_AVAILABLE = 'Not available'

/** @deprecated Prefer localized text via createTranslationGetter / useUiTranslation noData */
export const NOT_AVAILABLE_LABEL = FALLBACK_NOT_AVAILABLE

export function getNoDataLabel(lang: string): string {
  const primary = translationCache[lang]?.[NO_DATA_LC_KEY]
  if (primary && !isUnresolvedTranslation(NO_DATA_LC_KEY, primary)) return primary

  if (lang !== FALLBACK_LANG) {
    const cn = translationCache[FALLBACK_LANG]?.[NO_DATA_LC_KEY]
    if (cn && !isUnresolvedTranslation(NO_DATA_LC_KEY, cn)) return cn
  }

  return FALLBACK_NOT_AVAILABLE
}
/** @deprecated use NOT_AVAILABLE_LABEL */
export const NOT_IMPLEMENTED_LABEL = NOT_AVAILABLE_LABEL
/** @deprecated use NOT_AVAILABLE_LABEL */
export const TRANSLATION_UNAVAILABLE = NOT_AVAILABLE_LABEL

const isLcKey = (key: string) => key.startsWith('LC_')

/** True when no usable translation was loaded for this key. */
export function isMissingLcTranslation(key: string, value: string | undefined): boolean {
  if (!isLcKey(key)) return false
  if (!value?.trim()) return true
  if (value === key) return true
  if (value === NOT_AVAILABLE_LABEL) return true
  return false
}

const isUnresolvedTranslation = (key: string, value: string | undefined): boolean =>
  isMissingLcTranslation(key, value)

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function mapPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  if (!items.length) return
  const queue = [...items]
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()
      if (item != null) await worker(item)
    }
  })
  await Promise.all(runners)
}

async function fetchTranslationChunk(lang: string, part: string[]): Promise<void> {
  const table = `LanguagePackage_${lang}`
  if (!translationCache[lang]) translationCache[lang] = {}

  const needed = part.filter((k) => translationCache[lang][k] == null)
  if (!needed.length) return

  const sig = `${table}\0${needed.join('\0')}`
  const inflight = inflightChunks.get(sig)
  if (inflight) return inflight

  const promise = (async () => {
    const { data, error } = await supabase.from(table).select('*').in('key', needed)

    if (error) {
      console.error(`[translations] ${table}:`, error)
      return
    }

    for (const row of (data as { key: string; value?: string; text?: string }[]) || []) {
      translationCache[lang][row.key] = pickText(row) ?? row.key
    }
  })().finally(() => {
    inflightChunks.delete(sig)
  })

  inflightChunks.set(sig, promise)
  return promise
}

function pickText(row: { key?: string; value?: string; text?: string }): string | null {
  if (!row) return null
  if (typeof row.value === 'string' && row.value.length) return row.value
  if (typeof row.text === 'string' && row.text.length) return row.text
  return null
}

export function normalizeTranslationKeys(keys: string[]) {
  return Array.from(
    new Set(
      (keys || [])
        .filter((k) => typeof k === 'string' && k.trim())
        .map((k) => k.trim())
    )
  )
}

async function ensureTranslationsLoaded(lang: string, keys: string[]): Promise<void> {
  if (!keys.length) return

  if (!translationCache[lang]) translationCache[lang] = {}

  const uncached = keys.filter((k) => translationCache[lang][k] == null)
  if (!uncached.length) return

  await mapPool(chunk(uncached, CHUNK_SIZE), MAX_CONCURRENT_CHUNKS, (part) =>
    fetchTranslationChunk(lang, part)
  )
}

/** Preloads keys into the shared cache (same store as translateKeys). */
export async function preloadTranslations(lang: string, keys: string[]): Promise<void> {
  const normalized = normalizeTranslationKeys(keys)
  await ensureTranslationsLoaded(lang, normalized)
}

function buildTranslationMapFromCache(lang: string, keys: string[]): Record<string, string> {
  if (!keys.length) return {}

  const out: Record<string, string> = {}
  for (const key of keys) {
    const cached = translationCache[lang]?.[key]
    if (cached != null) out[key] = cached
  }
  return out
}

/** True when every requested key is already present in the in-memory cache. */
export function areTranslationsCached(lang: string, keys: string[]): boolean {
  const normalized = normalizeTranslationKeys(keys)
  if (!normalized.length) return true
  if (!translationCache[lang]) return false
  return normalized.every((key) => translationCache[lang][key] != null)
}

export function readCachedTranslations(lang: string, keys: string[]): Record<string, string> {
  return buildTranslationMapFromCache(lang, keys)
}

export type TranslationGetterOptions = {
  /** While true, unresolved LC keys return empty string instead of a fallback label. */
  pending?: boolean
  /** When set, fall back to the shared in-memory cache for this language. */
  lang?: string
}

function isPendingTranslationMap(
  translations: Record<string, string>,
  pending?: boolean
): boolean {
  if (pending != null) return pending
  return Object.keys(translations).length === 0
}

function resolveTranslation(key: string, lang: string): string {
  const primary = translationCache[lang]?.[key]
  if (!isUnresolvedTranslation(key, primary)) return primary!

  if (lang !== FALLBACK_LANG) {
    const cn = translationCache[FALLBACK_LANG]?.[key]
    if (!isUnresolvedTranslation(key, cn)) return cn!
  }

  return getNoDataLabel(lang)
}

/** Safe getter for preloaded translation maps — never surfaces raw LC_ keys. */
export function createTranslationGetter(
  translations: Record<string, string>,
  options?: TranslationGetterOptions
) {
  const pending = isPendingTranslationMap(translations, options?.pending)
  const lang = options?.lang
  const noData =
    translations[NO_DATA_LC_KEY] && !isMissingLcTranslation(NO_DATA_LC_KEY, translations[NO_DATA_LC_KEY])
      ? translations[NO_DATA_LC_KEY]
      : lang
        ? getNoDataLabel(lang)
        : FALLBACK_NOT_AVAILABLE

  return (key?: string): string => {
    if (!key?.trim()) return ''
    let resolved = translations[key]
    if (isLcKey(key)) {
      if (resolved == null || isMissingLcTranslation(key, resolved)) {
        if (lang) {
          const cached = translationCache[lang]?.[key]
          if (cached != null && !isMissingLcTranslation(key, cached)) return cached
        }
        if (pending) return ''
        return noData
      }
      return resolved
    }
    return resolved ?? key
  }
}

export async function translateKeys(keys: string[], lang: string = 'EN'): Promise<Record<string, string>> {
  const normalized = normalizeTranslationKeys([...keys, NO_DATA_LC_KEY])
  await ensureTranslationsLoaded(lang, normalized)

  if (!translationCache[lang]) translationCache[lang] = {}

  const lcKeysNeedingFallback = normalized.filter(
    (k) => isLcKey(k) && isUnresolvedTranslation(k, translationCache[lang][k])
  )

  if (lcKeysNeedingFallback.length && lang !== FALLBACK_LANG) {
    await ensureTranslationsLoaded(FALLBACK_LANG, lcKeysNeedingFallback)
  }

  const translations: Record<string, string> = {}
  for (const key of keys) {
    const t = typeof key === 'string' ? key.trim() : key
    if (!t) {
      translations[key] = ''
      continue
    }

    translations[key] = isLcKey(t) ? resolveTranslation(t, lang) : (translationCache[lang][t] ?? t)
  }

  return translations
}
