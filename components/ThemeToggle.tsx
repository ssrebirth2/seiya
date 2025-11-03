'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react' // ícones minimalistas e consistentes

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null
    const defaultTheme = storedTheme || 'dark'
    setTheme(defaultTheme)
    document.documentElement.classList.toggle('light', defaultTheme === 'light')
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.classList.toggle('light', newTheme === 'light')
    localStorage.setItem('theme', newTheme)
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-10 border border-[var(--panel-border)] rounded-md py-2.5 text-sm font-medium text-[var(--foreground)] bg-[var(--panel)] hover:bg-[var(--panel-hover)] transition-all duration-200 shadow-sm"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <div className="flex items-center gap-2 transition-all duration-300">
          <Sun size={16} className="text-yellow-400" />
        </div>
      ) : (
        <div className="flex items-center gap-2 transition-all duration-300">
          <Moon size={16} className="text-blue-300" />
        </div>
      )}
    </button>
  )
}
