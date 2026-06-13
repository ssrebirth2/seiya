'use client'

import { useMemo } from 'react'
import { useLanguage } from '@/context/language-context'
import { formatDisplayText } from '@/lib/game/apply-skill-values'
import {
  ALL_UI_LC_KEYS,
  NO_DATA_LC_KEY,
  SITE_LOCALIZED_LABELS,
  SITE_ONLY_LABELS,
  UI_KEYS,
} from './ui-keys'
import { DEFAULT_SITE_LANGUAGE } from './site-languages'
import { createTranslationGetter, normalizeTranslationKeys } from './language-package'
import { useTranslation } from './use-translation'

export { ALL_UI_LC_KEYS, SITE_LOCALIZED_LABELS, SITE_ONLY_LABELS, UI_KEYS }

type SiteOnlyKey = keyof typeof SITE_ONLY_LABELS
type SiteLocalizedKey = keyof typeof SITE_LOCALIZED_LABELS
type SiteLabelKey = SiteOnlyKey | SiteLocalizedKey

/**
 * Preloads all static UI LC keys. Call from pages that need full chrome translation.
 */
export function useUiTranslation(extraKeys: string[] = []) {
  const { lang } = useLanguage()
  const keys = useMemo(
    () => normalizeTranslationKeys([...ALL_UI_LC_KEYS, ...extraKeys]),
    [extraKeys.join('|')]
  )
  const { translations, isReady } = useTranslation(keys)

  const t = useMemo(
    () => createTranslationGetter(translations, { pending: !isReady, lang }),
    [translations, isReady, lang]
  )

  const tf = useMemo(
    () => (key?: string) => {
      const raw = t(key)
      return raw ? formatDisplayText(raw, 0, {}) : ''
    },
    [t]
  )

  const site = useMemo(
    () => (key: SiteLabelKey) => {
      if (key in SITE_LOCALIZED_LABELS) {
        const localized = SITE_LOCALIZED_LABELS[key as SiteLocalizedKey]
        return localized[lang as keyof typeof localized] ?? localized[DEFAULT_SITE_LANGUAGE]
      }
      return SITE_ONLY_LABELS[key as SiteOnlyKey]
    },
    [lang]
  )

  const noData = t(NO_DATA_LC_KEY)

  return { t, tf, site, noData, translations, isReady }
}
