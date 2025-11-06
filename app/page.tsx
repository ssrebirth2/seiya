// app/page.tsx
'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <div className="panel max-w-3xl shadow-lg p-8 border border-[--panel-border] bg-[--panel]">
        <h1 className="text-3xl font-bold mb-4 text-[--foreground] tracking-wide">
          Saint Seiya: Rebirth 2 (EX) Database
        </h1>

        <p className="text-[--text-muted] mb-6 leading-relaxed">
          Welcome to the ultimate (working in progress) database for <strong>Saint Seiya: Rebirth 2 (EX)</strong>.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/heroes"
            className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-2 rounded-md shadow-md hover:shadow-lg hover:scale-105 transition-all"
          >
            Heroes
          </Link>

          <Link
            href="/artifacts"
            className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white px-6 py-2 rounded-md shadow-md hover:shadow-lg hover:scale-105 transition-all"
          >
            Artifacts
          </Link>

          <Link
            href="/force-cards"
            className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-2 rounded-md shadow-md hover:shadow-lg hover:scale-105 transition-all"
          >
            Ultimate Power
          </Link>
        </div>

        <div className="mt-10 border-t border-[--panel-border] pt-4">
          <p className="text-sm text-[--text-muted]">
            💬 Join the{' '}
            <a
              href="https://discord.gg/JYSHChN5VM"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              official Discord server
            </a>{' '}
            to ask questions, report issues, or contribute to the project.
          </p>
        </div>
      </div>
    </div>
  )
}
