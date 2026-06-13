'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/context/language-context'
import {
  areTranslationsCached,
  normalizeTranslationKeys,
  readCachedTranslations,
  translateKeys,
} from './language-package'

export { preloadTranslations } from './language-package'

export function useTranslation(keys: string[]) {
  const { lang } = useLanguage()
  const normalizedKeys = useMemo(() => normalizeTranslationKeys(keys), [keys])
  const keysHash = useMemo(() => normalizedKeys.join('|'), [normalizedKeys])

  const [translations, setTranslations] = useState<Record<string, string>>(() =>
    readCachedTranslations(lang, normalizedKeys)
  )
  const [isReady, setIsReady] = useState(() => areTranslationsCached(lang, normalizedKeys))

  // Sync from shared cache immediately when language changes (no full-page skeleton flash).
  useEffect(() => {
    const cached = readCachedTranslations(lang, normalizedKeys)
    setTranslations(cached)
    setIsReady(areTranslationsCached(lang, normalizedKeys) || Object.keys(cached).length > 0)
  }, [lang, keysHash, normalizedKeys])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!normalizedKeys.length) {
        setTranslations({})
        setIsReady(true)
        return
      }

      const mapped = await translateKeys(normalizedKeys, lang)
      if (!cancelled) {
        setTranslations(mapped)
        setIsReady(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [lang, keysHash, normalizedKeys])

  return { translations, isReady }
}
