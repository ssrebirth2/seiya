// lib/translate.ts — cache único para LanguagePackage_* (translateKeys + preloadTranslations + useTranslation)
import { supabase } from './supabase'

const translationCache: Record<string, Record<string, string>> = {}
const CHUNK_SIZE = 200

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

export async function translateKeys(keys: string[], lang: string = 'EN'): Promise<Record<string, string>> {
  const normalized = normalizeTranslationKeys(keys)
  await ensureTranslationsLoaded(lang, normalized)

  if (!translationCache[lang]) translationCache[lang] = {}

  const translations: Record<string, string> = {}
  for (const key of keys) {
    const t = typeof key === 'string' ? key.trim() : key
    translations[key] = (t ? translationCache[lang][t] : undefined) ?? key
  }

  return translations
}
