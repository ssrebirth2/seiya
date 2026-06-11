'use client'

import Link from 'next/link'
import { Users, Shield, Zap, Wrench } from 'lucide-react'

export default function Home() {
  return (
    <div className="page-stack w-full items-center px-4 py-8 text-center animate-fadeIn">
      <div className="panel w-full max-w-4xl rounded-xl p-8 shadow-lg sm:p-10">
        <h1 className="mb-4 text-3xl font-extrabold tracking-wide text-foreground sm:text-4xl">
          Saint Seiya: Rebirth 2 (EX) Database
        </h1>

        <p className="mx-auto mb-8 max-w-2xl leading-relaxed text-text-muted">
          Welcome to the ultimate database and toolkit for{' '}
          <strong className="text-foreground">Saint Seiya: Rebirth 2 (EX)</strong>. Explore heroes,
          artifacts, and powers — or build your dream team.
        </p>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link href="/heroes" className="link-card group">
            <div className="flex flex-col items-center gap-2">
              <Users size={28} className="text-icon-hero transition-transform group-hover:scale-110" />
              <h3 className="text-lg font-semibold text-foreground">Heroes</h3>
              <p className="text-xs text-text-muted">
                Browse all characters with their stats, skills, and awakenings.
              </p>
            </div>
          </Link>

          <Link href="/artifacts" className="link-card group">
            <div className="flex flex-col items-center gap-2">
              <Shield size={28} className="text-icon-artifact transition-transform group-hover:scale-110" />
              <h3 className="text-lg font-semibold text-foreground">Artifacts</h3>
              <p className="text-xs text-text-muted">
                Discover all legendary artifacts and their unique powers.
              </p>
            </div>
          </Link>

          <Link href="/force-cards" className="link-card group">
            <div className="flex flex-col items-center gap-2">
              <Zap size={28} className="text-icon-force transition-transform group-hover:scale-110" />
              <h3 className="text-lg font-semibold text-foreground">Ultimate Power</h3>
              <p className="text-xs text-text-muted">View Force Cards, effects, and combinations.</p>
            </div>
          </Link>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 border-b border-panel-border pb-2 text-lg font-semibold text-foreground">
            Tools
          </h2>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/team-builder" className="btn-tool">
              <Wrench size={18} className="text-icon-tool" />
              <span>Team Builder</span>
            </Link>
          </div>
        </section>

        <div className="mt-10 border-t border-panel-border pt-4">
          <p className="text-sm text-text-muted">
            Join the{' '}
            <a
              href="https://discord.gg/JYSHChN5VM"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
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
