// components/ThemeToggle.tsx
'use client'

import { useEffect, useState } from 'react'

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
      className="mt-4 w-full text-center block border border-[var(--panel-border)] rounded p-2 hover:bg-[var(--panel-hover)]"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
