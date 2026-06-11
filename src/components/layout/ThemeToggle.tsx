'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

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
      className="flex w-10 items-center justify-center rounded-md border border-panel-border bg-panel py-2.5 text-sm font-medium text-foreground shadow-sm transition-all duration-200 hover:bg-panel-hover"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun size={16} className="text-icon-artifact" />
      ) : (
        <Moon size={16} className="text-accent" />
      )}
    </button>
  )
}
