'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type LanguageContextType = {
  lang: string
  setLang: (lang: string) => void
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'EN',
  setLang: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState('EN')

  useEffect(() => {
    const stored = localStorage.getItem('lang')
    if (stored) setLangState(stored)
  }, [])

  const setLang = (newLang: string) => {
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
