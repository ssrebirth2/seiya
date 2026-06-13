'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_SITE_LANGUAGE, SITE_LANGUAGE_CODES } from '@/lib/i18n/site-languages'
import { preloadTranslations } from '@/lib/i18n/language-package'
import { ALL_UI_LC_KEYS } from '@/lib/i18n/ui-keys'

type LanguageContextType = {
  lang: string
  setLang: (lang: string) => void
}

const LanguageContext = createContext<LanguageContextType>({
  lang: DEFAULT_SITE_LANGUAGE,
  setLang: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState(DEFAULT_SITE_LANGUAGE)

  useEffect(() => {
    const stored = localStorage.getItem('lang')
    if (stored && SITE_LANGUAGE_CODES.includes(stored)) {
      setLangState(stored)
    }
  }, [])

  // Preload UI strings in background — never block the shell.
  useEffect(() => {
    preloadTranslations(lang, ALL_UI_LC_KEYS).catch((error) => {
      console.error('[i18n] Failed to preload UI translations:', error)
    })
  }, [lang])

  const setLang = (newLang: string) => {
    if (!SITE_LANGUAGE_CODES.includes(newLang)) return
    localStorage.setItem('lang', newLang)
    setLangState(newLang)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
