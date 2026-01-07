'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useLanguage } from '@/context/LanguageContext'
import { useState, useEffect } from 'react'
import { Home, Users, Shield, Zap, Wrench } from 'lucide-react' // 🧩 Wrench para Tools ícone

const navItemsMain = [
  { label: 'Home', href: '/', icon: <Home size={16} /> },
  { label: 'Heroes', href: '/heroes', icon: <Users size={16} /> },
  { label: 'Artifacts', href: '/artifacts', icon: <Shield size={16} /> },
  { label: 'Ultimate Power', href: '/force-cards', icon: <Zap size={16} /> },
]

// 🧰 Nova seção "TOOLS"
const navItemsTools = [
  { label: 'Team Builder', href: '/team-builder', icon: <Wrench size={16} /> },
  { label: 'News', href: '/news', icon: <Wrench size={16} /> },
]

const LANGUAGES = [
  { code: 'CN', label: '🇨🇳 中文' },
  { code: 'PT', label: '🇧🇷 Português' },
  { code: 'EN', label: '🇺🇸 English' },
  { code: 'ES', label: '🇪🇸 Español' },
  { code: 'FR', label: '🇫🇷 Français' },
  { code: 'ID', label: '🇮🇩 Bahasa Indonesia' },
  { code: 'TH', label: '🇹🇭 ไทย' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { lang, setLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <>
      {/* Botão flutuante (mobile) */}
      {isMobile && !open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-1 right-1 z-50 bg-[var(--panel)] border-[var(--panel-border)] text-[var(--foreground)] shadow-md hover:shadow-lg p-3 text-lg hover:bg-[var(--panel-hover)] active:scale-95 transition-all duration-200"
          aria-label="Open sidebar"
        >
          ☰
        </button>
      )}

      {/* Overlay (mobile) */}
      {isMobile && open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fadeIn"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      {(!isMobile || open) && (
        <aside
          className={`fixed top-0 left-0 z-50 h-screen w-[var(--sidebar-width,16rem)] bg-[var(--panel)] border-r border-[var(--panel-border)] flex flex-col justify-between transition-transform duration-300 ease-in-out ${
            isMobile
              ? `${open ? 'translate-x-0 shadow-xl' : '-translate-x-full'}`
              : 'translate-x-0'
          }`}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-[var(--panel-border)]">
            <h1 className="text-lg font-bold tracking-wide text-center uppercase text-[var(--foreground)]">
              Menu
            </h1>
            <br />
            <div className="text-center">
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="px-2 py-1 border border-[var(--panel-border)] bg-[var(--panel-hover)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--panel-border)] transition"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Navegação */}
          <nav className="flex-1 overflow-y-auto mt-4 px-3">
            {/* 🔹 MAIN Section */}
            <h3 className="text-[10px] uppercase text-[var(--text-muted)] font-semibold px-4 mb-2 tracking-wider">
              Main
            </h3>
            <ul className="space-y-1 mb-6">
              {navItemsMain.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                      pathname === item.href
                        ? 'bg-[var(--panel-hover)] border border-[var(--panel-border)] shadow-inner text-[var(--foreground)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--panel-hover)]'
                    }`}
                  >
                    <span className="opacity-80">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* 🔹 TOOLS Section */}
            <h3 className="text-[10px] uppercase text-[var(--text-muted)] font-semibold px-4 mb-2 tracking-wider">
              Tools
            </h3>
            <ul className="space-y-1">
              {navItemsTools.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                      pathname === item.href
                        ? 'bg-[var(--panel-hover)] border border-[var(--panel-border)] shadow-inner text-[var(--foreground)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--panel-hover)]'
                    }`}
                  >
                    <span className="opacity-80">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Rodapé */}
          <footer className="p-4 border-t border-[var(--panel-border)] text-[var(--text-muted)] text-xs">
            <div className="flex items-center justify-between mb-3">
              <ThemeToggle />
            </div>
          </footer>
        </aside>
      )}
    </>
  )
}
