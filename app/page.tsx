// app/page.tsx
'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="panel">
      <h2 className="text-xl mb-4">Bem-vindo ao Game Datamine</h2>
      <p className="mb-4">Explore os dados do jogo como heróis, habilidades, relações e mais.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/heroes" className="block p-4 border border-[var(--panel-border)] rounded bg-[var(--panel-hover)] hover:underline">
          🧙 Heróis
        </Link>
      </div>
    </div>
  )
}
