'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useLanguage } from '@/context/language-context'
import { DEFAULT_SITE_LANGUAGE, SITE_LANGUAGES } from '@/lib/i18n/site-languages'

export function LanguageSelector() {
  const { lang, setLang, prefetchLang, isSwitchingLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current =
    SITE_LANGUAGES.find((l) => l.code === lang) ??
    SITE_LANGUAGES.find((l) => l.code === DEFAULT_SITE_LANGUAGE) ??
    SITE_LANGUAGES[0]

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isSwitchingLang}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-panel-border bg-panel px-3 py-2 text-xs text-foreground transition hover:bg-panel-hover disabled:cursor-wait disabled:opacity-70"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
      >
        <span className="truncate">{current.label}</span>
        <ChevronDown size={14} className={`shrink-0 opacity-60 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 scroll-panel-y rounded-lg border border-panel-border bg-panel-solid py-1 shadow-lg"
        >
          {SITE_LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={lang === l.code}
                disabled={isSwitchingLang}
                onMouseEnter={() => prefetchLang(l.code)}
                onFocus={() => prefetchLang(l.code)}
                onClick={() => {
                  setLang(l.code)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition hover:bg-panel-hover disabled:cursor-wait disabled:opacity-60"
              >
                {l.label}
                {lang === l.code ? <Check size={14} className="text-accent" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
