'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useLanguage } from '@/context/LanguageContext'
import { useState, useEffect } from 'react'

const navItems = [
  { label: '🏠 Início', href: '/' },
  { label: '🧙 Heróis', href: '/heroes' },
]

const LANGUAGES = [
  { code: 'EN', label: '🇺🇸 English' },
  { code: 'CN', label: '🇨🇳 中文' },
  { code: 'ID', label: '🇮🇩 Bahasa Indonesia' },
  { code: 'TH', label: '🇹🇭 ไทย' },
  { code: 'PT', label: '🇧🇷 Português' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { lang, setLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(false)

  // 🔹 Detecta automaticamente janelas pequenas
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      // Considera compacto até 1280px pra garantir botão visível em qualquer tela
      setIsCompact(width < 1280)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <>
      {/* 🔹 Botão flutuante — sempre visível em telas pequenas */}
      {isCompact && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 left-5 z-50 bg-[var(--panel)] text-[var(--foreground)] border border-[var(--panel-border)] rounded-full shadow-lg p-3 text-2xl hover:bg-[var(--panel-hover)] active:scale-95 transition-all duration-200"
          aria-label="Abrir menu lateral"
        >
          ☰
        </button>
      )}

      {/* 🔹 Overlay (fundo escuro clicável) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[1px] z-40 animate-fadeIn"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 🔹 Sidebar */}
      <aside
        className={`sidebar-toc fixed top-0 left-0 h-full z-50 bg-[var(--panel)] border-r border-[var(--panel-border)] transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          ${!isCompact ? 'md:static md:translate-x-0 md:h-fit md:rounded md:shadow-none' : 'shadow-2xl'}
        `}
      >
        <div className="p-4 flex flex-col h-full">
          {/* Cabeçalho (mobile) */}
          {isCompact && (
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold">Menu</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-xl font-bold hover:text-[var(--text-muted)]"
              >
                ✖
              </button>
            </div>
          )}

          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase mb-2">
            Navegação
          </h2>

          <ul className="flex-1">
            {navItems.map((item) => (
              <li
                key={item.href}
                className={`rounded mb-1 ${
                  pathname === item.href ? 'bg-[var(--panel-hover)]' : ''
                }`}
              >
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 hover:bg-[var(--panel-hover)] rounded transition"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1">
              🌐 Idioma
            </label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="w-full p-2 border border-[var(--panel-border)] bg-[var(--panel-hover)] rounded text-sm"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  )
}
