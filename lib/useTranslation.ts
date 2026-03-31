'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'

const cache: Record<string, Record<string, string>> = {}
const CHUNK_SIZE = 200 // ✅ menor = mais seguro (evita URL/payload grande)

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function pickText(row: any): string | null {
  if (!row) return null
  if (typeof row.value === 'string' && row.value.length) return row.value // seu schema
  if (typeof row.text === 'string' && row.text.length) return row.text
  return null
}

function normalizeKeys(keys: string[]) {
  return Array.from(
    new Set(
      (keys || [])
        .filter((k) => typeof k === 'string' && k.trim())
        .map((k) => k.trim())
    )
  )
}

/** ✅ Preload: popula o cache do idioma. NÃO deve travar UI. */
export async function preloadTranslations(lang: string, keys: string[]) {
  const normalized = normalizeKeys(keys)
  if (!normalized.length) return

  const table = `LanguagePackage_${lang}`
  cache[lang] = cache[lang] || {}

  const uncached = normalized.filter((k) => cache[lang][k] == null)
  if (!uncached.length) return

  for (const part of chunk(uncached, CHUNK_SIZE)) {
    const { data, error } = await supabase.from(table).select('*').in('key', part)

    if (error) {
      console.error(`[preloadTranslations] ${table}:`, error)
      continue
    }

    for (const row of (data as any[]) || []) {
      cache[lang][row.key] = pickText(row) ?? row.key
    }
  }
}

export function useTranslation(keys: string[]) {
  const { lang } = useLanguage()
  const [translations, setTranslations] = useState<Record<string, string>>({})

  const normalizedKeys = useMemo(() => normalizeKeys(keys), [keys])
  const keysHash = useMemo(() => normalizedKeys.join('|'), [normalizedKeys])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!normalizedKeys.length) {
        setTranslations({})
        return
      }

      // ✅ Não confie só no hook anterior — sempre garante cache preenchido
      await preloadTranslations(lang, normalizedKeys)

      const mapped: Record<string, string> = {}
      cache[lang] = cache[lang] || {}
      for (const k of normalizedKeys) mapped[k] = cache[lang][k] || k

      if (!cancelled) setTranslations(mapped)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [lang, keysHash])

  return translations
}
