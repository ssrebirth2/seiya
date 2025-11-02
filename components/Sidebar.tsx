'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useLanguage } from '@/context/LanguageContext'

const navItems = [
  { label: '🏠 Início', href: '/' },
  { label: '🧙 Heróis', href: '/heroes' },
]

const LANGUAGES = [
  { code: 'EN', label: '🇺🇸 English' },
  { code: 'CN', label: '🇨🇳 中文' },         // Chinês simplificado
  { code: 'ID', label: '🇮🇩 Bahasa Indonesia' }, // Indonésio
  { code: 'TH', label: '🇹🇭 ไทย' },          // Tailandês
  { code: 'PT', label: '🇧🇷 Português' }     // Português (Brasil)
];

export function Sidebar() {
  const pathname = usePathname()
  const { lang, setLang } = useLanguage()

  return (
    <aside className="sidebar-toc sticky top-4 h-fit">
      <h2>Navegação</h2>
      <ul>
        {navItems.map((item) => (
          <li key={item.href} className={pathname === item.href ? 'bg-[var(--panel-hover)]' : ''}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <label className="block text-xs text-[var(--text-muted)] mb-1">🌐 Idioma</label>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="w-full p-1 border border-[var(--panel-border)] bg-[var(--panel)] rounded text-sm"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <ThemeToggle />
    </aside>
  )
}
