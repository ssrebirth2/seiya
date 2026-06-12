'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useLanguage } from '@/context/language-context'
import { useState, useEffect, useMemo } from 'react'
import { Home, Users, Shield, Sparkles, Zap, Wrench } from 'lucide-react'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

const navItemsMain = [
  { lcKey: UI_KEYS.nav.home, href: '/', icon: <Home size={16} /> },
  { lcKey: UI_KEYS.nav.heroes, href: '/heroes', icon: <Users size={16} /> },
  { lcKey: UI_KEYS.nav.artifacts, href: '/artifacts', icon: <Shield size={16} /> },
  { lcKey: UI_KEYS.nav.companions, href: '/companions', icon: <Sparkles size={16} /> },
  { lcKey: UI_KEYS.nav.forceCards, href: '/force-cards', icon: <Zap size={16} /> },
]

const navItemsTools = [
  { lcKey: UI_KEYS.nav.teamBuilder, href: '/team-builder', icon: <Wrench size={16} /> },
]

const LANGUAGES = [
  { code: 'CN', label: '🇨🇳 中文' },
  { code: 'PT', label: '🇧🇷 Português' },
  { code: 'EN', label: '🇺🇸 English' },
  { code: 'SP', label: '🇪🇸 Español' },
  { code: 'FR', label: '🇫🇷 Français' },
  { code: 'ID', label: '🇮🇩 Bahasa Indonesia' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { lang, setLang } = useLanguage()
  const { t, site } = useUiTranslation()
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const toolsLabel = useMemo(() => t(UI_KEYS.nav.tools), [t])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <>
      {isMobile && !open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-1 right-1 z-50 border border-panel-border bg-panel p-3 text-lg text-foreground shadow-md transition-all duration-200 hover:bg-panel-hover hover:shadow-lg active:scale-95"
          aria-label={site('openSidebar')}
        >
          ☰
        </button>
      )}

      {isMobile && open && (
        <div
          className="overlay-backdrop fixed inset-0 z-40 animate-fadeIn backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {(!isMobile || open) && (
        <aside
          className={`fixed top-0 left-0 z-50 flex h-screen w-[var(--sidebar-width,16rem)] flex-col justify-between border-r border-panel-border bg-panel-solid transition-transform duration-300 ease-in-out ${
            isMobile
              ? `${open ? 'translate-x-0 shadow-xl' : '-translate-x-full'}`
              : 'translate-x-0'
          }`}
        >
          <div className="border-b border-panel-border px-6 pb-4 pt-6">
            <div className="text-center">
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="control-input text-xs"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <nav className="mt-4 flex-1 overflow-y-auto px-3">
            <ul className="mb-6 space-y-1">
              {navItemsMain.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 ${
                      pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(`${item.href}/`))
                        ? 'border border-panel-border bg-panel-hover text-foreground shadow-inner'
                        : 'text-text-muted hover:bg-panel-hover hover:text-foreground'
                    }`}
                  >
                    <span className="opacity-80">{item.icon}</span>
                    <span>{t(item.lcKey)}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {toolsLabel}
            </h3>
            <ul className="space-y-1">
              {navItemsTools.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 ${
                      pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(`${item.href}/`))
                        ? 'border border-panel-border bg-panel-hover text-foreground shadow-inner'
                        : 'text-text-muted hover:bg-panel-hover hover:text-foreground'
                    }`}
                  >
                    <span className="opacity-80">{item.icon}</span>
                    <span>{t(item.lcKey)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <footer className="border-t border-panel-border p-4 text-xs text-text-muted">
            <div className="mb-3 flex items-center justify-between">
              <ThemeToggle />
            </div>
          </footer>
        </aside>
      )}
    </>
  )
}
