'use client'

import Link from 'next/link'
import { Users, Shield, Zap, Wrench } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 py-16">
      <div className="panel max-w-4xl w-full shadow-lg rounded-xl border border-[--panel-border] bg-[--panel] p-8 sm:p-10">
        {/* 🔹 Header */}
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 text-[--foreground] tracking-wide">
          Saint Seiya: Rebirth 2 (EX) Database
        </h1>

        <p className="text-[--text-muted] mb-8 leading-relaxed max-w-2xl mx-auto">
          Welcome to the ultimate database and toolkit for{' '}
          <strong className="text-[--foreground]">Saint Seiya: Rebirth 2 (EX)</strong>.  
          Explore heroes, artifacts, and powers — or build your dream team.
        </p>

        {/* 🔹 Main Sections */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link
            href="/heroes"
            className="group border border-[--panel-border] rounded-lg p-6 bg-[--panel-hover] hover:bg-[--panel] shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex flex-col items-center gap-2">
              <Users size={28} className="text-blue-400 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-[--foreground] text-lg">Heroes</h3>
              <p className="text-xs text-[--text-muted]">
                Browse all characters with their stats, skills, and awakenings.
              </p>
            </div>
          </Link>

          <Link
            href="/artifacts"
            className="group border border-[--panel-border] rounded-lg p-6 bg-[--panel-hover] hover:bg-[--panel] shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex flex-col items-center gap-2">
              <Shield size={28} className="text-amber-400 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-[--foreground] text-lg">Artifacts</h3>
              <p className="text-xs text-[--text-muted]">
                Discover all legendary artifacts and their unique powers.
              </p>
            </div>
          </Link>

          <Link
            href="/force-cards"
            className="group border border-[--panel-border] rounded-lg p-6 bg-[--panel-hover] hover:bg-[--panel] shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex flex-col items-center gap-2">
              <Zap size={28} className="text-green-400 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-[--foreground] text-lg">Ultimate Power</h3>
              <p className="text-xs text-[--text-muted]">
                View Force Cards, effects, and combinations.
              </p>
            </div>
          </Link>
        </section>

        {/* 🔹 Tools Section */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-[--foreground] mb-3 border-b border-[--panel-border] pb-2">
            Tools
          </h2>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/team-builder"
              className="flex items-center gap-2 px-5 py-3 border border-[--panel-border] rounded-md bg-[--panel-hover] hover:bg-[--panel] text-[--foreground] shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Wrench size={18} className="text-indigo-400" />
              <span className="font-medium">Team Builder</span>
            </Link>
          </div>
        </section>

        {/* 🔹 Footer */}
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
