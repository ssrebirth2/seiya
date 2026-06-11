// lib/translate.ts — cache único para LanguagePackage_* (translateKeys + preloadTranslations + useTranslation)
import { supabase } from '@/lib/supabase-client'

const translationCache: Record<string, Record<string, string>> = {}
const CHUNK_SIZE = 200
const FALLBACK_LANG = 'CN'
export const TRANSLATION_UNAVAILABLE = 'Translation unavailable'

const isLcKey = (key: string) => key.startsWith('LC_')

/** True when no usable translation was loaded for this key. */
const isUnresolvedTranslation = (key: string, value: string | undefined): boolean => {
  if (!value?.trim()) return true
  return value === key
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
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

  const table = `LanguagePackage_${lang}`
  if (!translationCache[lang]) translationCache[lang] = {}

  const uncached = keys.filter((k) => translationCache[lang][k] == null)
  if (!uncached.length) return

  for (const part of chunk(uncached, CHUNK_SIZE)) {
    const { data, error } = await supabase.from(table).select('*').in('key', part)

    if (error) {
      console.error(`[translations] ${table}:`, error)
      continue
    }

    for (const row of (data as { key: string; value?: string; text?: string }[]) || []) {
      translationCache[lang][row.key] = pickText(row) ?? row.key
    }
  }
}

/** Preloads keys into the shared cache (same store as translateKeys). */
export async function preloadTranslations(lang: string, keys: string[]): Promise<void> {
  const normalized = normalizeTranslationKeys(keys)
  await ensureTranslationsLoaded(lang, normalized)
}

function resolveTranslation(key: string, lang: string): string {
  const primary = translationCache[lang]?.[key]
  if (!isUnresolvedTranslation(key, primary)) return primary!

  if (lang !== FALLBACK_LANG) {
    const cn = translationCache[FALLBACK_LANG]?.[key]
    if (!isUnresolvedTranslation(key, cn)) return cn!
  }

  return TRANSLATION_UNAVAILABLE
}

export async function translateKeys(keys: string[], lang: string = 'EN'): Promise<Record<string, string>> {
  const normalized = normalizeTranslationKeys(keys)
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
