'use client'

import { useMemo } from 'react'
import { formatDisplayText } from '@/lib/game/apply-skill-values'
import {
  ALL_UI_LC_KEYS,
  NO_DATA_LC_KEY,
  SITE_ONLY_LABELS,
  UI_KEYS,
} from './ui-keys'
import { createTranslationGetter, normalizeTranslationKeys } from './language-package'
import { useTranslation } from './use-translation'

export { ALL_UI_LC_KEYS, SITE_ONLY_LABELS, UI_KEYS }

type SiteOnlyKey = keyof typeof SITE_ONLY_LABELS

/**
 * Preloads all static UI LC keys. Call from pages that need full chrome translation.
 */
export function useUiTranslation(extraKeys: string[] = []) {
  const keys = useMemo(
    () => normalizeTranslationKeys([...ALL_UI_LC_KEYS, ...extraKeys]),
    [extraKeys.join('|')]
  )
  const translations = useTranslation(keys)

  const t = useMemo(() => createTranslationGetter(translations), [translations])

  const tf = useMemo(
    () => (key?: string) => {
      const raw = t(key)
      return raw ? formatDisplayText(raw, 0, {}) : ''
    },
    [t]
  )

  const site = useMemo(
    () => (key: SiteOnlyKey) => SITE_ONLY_LABELS[key],
    []
  )

  const noData = t(NO_DATA_LC_KEY)

  return { t, tf, site, noData, translations }
}
