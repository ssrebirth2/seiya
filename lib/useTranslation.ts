// lib/useTranslation.ts
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'

const cache: Record<string, Record<string, string>> = {} // cache por idioma

export function useTranslation(keys: string[]) {
  const { lang } = useLanguage()
  const [translations, setTranslations] = useState<Record<string, string>>({})

  useEffect(() => {
    const load = async () => {
      if (keys.length === 0) return
      const table = `LanguagePackage_${lang}`

      const uncachedKeys = keys.filter((k) => !(cache[lang]?.[k]))

      if (uncachedKeys.length > 0) {
        const { data } = await supabase
          .from(table)
          .select('key, text')
          .in('key', uncachedKeys)

        if (data) {
          cache[lang] = cache[lang] || {}
          for (const row of data) {
            cache[lang][row.key] = row.text
          }
        }
      }

      const mapped: Record<string, string> = {}
      keys.forEach((k) => {
        mapped[k] = cache[lang]?.[k] || k
      })

      setTranslations(mapped)
    }

    load()
  }, [lang, keys])

  return translations
}
