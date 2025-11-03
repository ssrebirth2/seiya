'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useLanguage } from '@/context/LanguageContext'
import { useState, useEffect } from 'react'

const navItems = [
  { label: 'Início', href: '/' },
  { label: 'Heróis', href: '/heroes' },
  { label: 'Artefatos', href: '/artifacts' },
]

const LANGUAGES = [
  { code: 'CN', label: '🇨🇳 中文' },
  { code: 'EN', label: '🇺🇸 English' },
  { code: 'ID', label: '🇮🇩 Bahasa Indonesia' },
  { code: 'TH', label: '🇹🇭 ไทย' },
  { code: 'BR', label: '🇧🇷 Português(IA)' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { lang, setLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(false)

  // 🔹 Detecta automaticamente janelas pequenas
  useEffect(() => {
    const handleResize = () => setIsCompact(window.innerWidth < 1280)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <>
      {/* 🔹 Botão flutuante — aparece sempre em telas pequenas */}
      {isCompact && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-6 z-50 bg-[var(--panel)] border border-[var(--panel-border)] text-[var(--foreground)] rounded-full shadow-md hover:shadow-lg p-3 text-2xl hover:bg-[var(--panel-hover)] active:scale-95 transition-all duration-200 backdrop-blur-sm"
          aria-label="Abrir menu lateral"
        >
          ☰
        </button>
      )}

      {/* 🔹 Overlay escuro */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fadeIn"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 🔹 Sidebar principal */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 bg-[var(--panel)] border-r border-[var(--panel-border)] 
          transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          ${!isCompact ? 'md:static md:translate-x-0 md:h-fit md:shadow-none' : 'shadow-lg rounded-r-lg'}
        `}
      >
        <div className="flex flex-col h-full p-4 space-y-4 text-[var(--foreground)]">
          {/* 🔹 Cabeçalho (mobile) */}
          {isCompact && (
            <div className="flex justify-between items-center mb-2 border-b border-[var(--panel-border)] pb-2">
              <h2 className="text-base font-semibold text-[var(--text-muted)] tracking-wide">
                Menu
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-lg font-bold hover:text-[var(--text-muted)] transition"
              >
                ✖
              </button>
            </div>
          )}

          {/* 🔹 Tema e idioma */}
          <div className="space-y-3">
            <ThemeToggle />
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                🌐
              </label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="w-full p-2 border border-[var(--panel-border)] bg-[var(--panel-hover)] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--panel-border)] transition"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 🔹 Navegação */}
          <div className="mt-2">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
              Navegação
            </h3>

            <ul className="flex-1 space-y-1">
              {navItems.map((item) => (
                <li
                  key={item.href}
                  className={`rounded-md overflow-hidden ${
                    pathname === item.href
                      ? 'bg-[var(--panel-hover)] border border-[var(--panel-border)] shadow-inner'
                      : 'hover:bg-[var(--panel-hover)] transition'
                  }`}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2 text-sm font-medium tracking-wide"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 🔹 Rodapé */}
          <div className="mt-auto pt-3 border-t border-[var(--panel-border)] text-center text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} Game Datamine
          </div>
        </div>
      </aside>
    </>
  )
}
