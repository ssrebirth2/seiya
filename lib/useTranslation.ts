'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { normalizeTranslationKeys, preloadTranslations, translateKeys } from './translate'

export { preloadTranslations } from './translate'

export function useTranslation(keys: string[]) {
  const { lang } = useLanguage()
  const [translations, setTranslations] = useState<Record<string, string>>({})

  const normalizedKeys = useMemo(() => normalizeTranslationKeys(keys), [keys])
  const keysHash = useMemo(() => normalizedKeys.join('|'), [normalizedKeys])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!normalizedKeys.length) {
        setTranslations({})
        return
      }

      const mapped = await translateKeys(normalizedKeys, lang)
      if (!cancelled) setTranslations(mapped)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [lang, keysHash])

  return translations
}
