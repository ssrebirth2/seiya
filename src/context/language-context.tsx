'use client'

import { createContext, useContext, useEffect, useState, useCallback, Suspense, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { DEFAULT_SITE_LANGUAGE, SITE_LANGUAGE_CODES } from '@/lib/i18n/site-languages'
import { preloadTranslations } from '@/lib/i18n/language-package'
import { ALL_UI_LC_KEYS } from '@/lib/i18n/ui-keys'

type LanguageContextType = {
  lang: string
  setLang: (lang: string) => void
  prefetchLang: (lang: string) => void
  isSwitchingLang: boolean
}

const LanguageContext = createContext<LanguageContextType>({
  lang: DEFAULT_SITE_LANGUAGE,
  setLang: () => {},
  prefetchLang: () => {},
  isSwitchingLang: false,
})

function readStoredLang(): string | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('lang')?.toUpperCase()
  return stored && SITE_LANGUAGE_CODES.includes(stored) ? stored : null
}

function LanguageProviderInner({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState(DEFAULT_SITE_LANGUAGE)
  const [isSwitchingLang, setIsSwitchingLang] = useState(false)
  const prefetchingRef = useRef<Set<string>>(new Set())
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [hydrated, setHydrated] = useState(false)

  // Keep ?lang= on every route (including EN) and sync URL ↔ state
  useEffect(() => {
    const urlLang = searchParams.get('lang')?.toUpperCase()
    const storedLang = readStoredLang()

    const effective =
      urlLang && SITE_LANGUAGE_CODES.includes(urlLang)
        ? urlLang
        : storedLang ?? DEFAULT_SITE_LANGUAGE

    setLangState(effective)
    if (typeof window !== 'undefined') {
      localStorage.setItem('lang', effective)
    }

    if (!urlLang || !SITE_LANGUAGE_CODES.includes(urlLang)) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('lang', effective)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }

    setHydrated(true)
  }, [pathname, searchParams, router])

  useEffect(() => {
    if (!hydrated) return
    preloadTranslations(lang, ALL_UI_LC_KEYS).catch((error) => {
      console.error('[i18n] Failed to preload UI translations:', error)
    })
  }, [lang, hydrated])

  const prefetchLang = useCallback((targetLang: string) => {
    if (!SITE_LANGUAGE_CODES.includes(targetLang)) return
    if (prefetchingRef.current.has(targetLang)) return
    prefetchingRef.current.add(targetLang)
    preloadTranslations(targetLang, ALL_UI_LC_KEYS)
      .catch((error) => {
        console.error('[i18n] Failed to prefetch UI translations:', error)
      })
      .finally(() => {
        prefetchingRef.current.delete(targetLang)
      })
  }, [])

  const setLang = useCallback(
    (newLang: string) => {
      if (!SITE_LANGUAGE_CODES.includes(newLang) || newLang === lang) return

      const applyLang = () => {
        localStorage.setItem('lang', newLang)
        setLangState(newLang)

        const params = new URLSearchParams(searchParams.toString())
        params.set('lang', newLang)
        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      }

      setIsSwitchingLang(true)
      preloadTranslations(newLang, ALL_UI_LC_KEYS)
        .then(applyLang)
        .catch((error) => {
          console.error('[i18n] Failed to preload UI translations:', error)
          applyLang()
        })
        .finally(() => {
          setIsSwitchingLang(false)
        })
    },
    [pathname, router, searchParams, lang]
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, prefetchLang, isSwitchingLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <LanguageProviderInner>{children}</LanguageProviderInner>
    </Suspense>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
