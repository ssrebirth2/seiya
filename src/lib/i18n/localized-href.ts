'use client'

import { useCallback } from 'react'
import { useLanguage } from '@/context/language-context'
import { buildShareUrl } from '@/lib/metadata/share-url'

/** Appends ?lang= (including EN) to an internal path. */
export function localizedHref(path: string, lang: string): string {
  return buildShareUrl(path, lang)
}

export function useLocalizedHref() {
  const { lang } = useLanguage()
  return useCallback((path: string) => localizedHref(path, lang), [lang])
}
