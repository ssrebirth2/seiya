'use client'

import Link from 'next/link'
import { Users, Shield, Sparkles, Zap, Wrench } from 'lucide-react'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

export default function Home() {
  const { t, site } = useUiTranslation()

  return (
    <div className="page-stack w-full animate-fadeIn items-center px-4 py-8 text-center">
      <div className="panel w-full max-w-4xl rounded-xl p-8 shadow-lg sm:p-10">
        <h1 className="mb-4 text-3xl font-extrabold tracking-wide text-foreground sm:text-4xl">
          {site('databaseTitle')}
        </h1>

        <p className="mx-auto mb-8 max-w-2xl leading-relaxed text-text-muted">
          {site('databaseWelcome')}
        </p>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/heroes" className="link-card group">
            <div className="flex flex-col items-center gap-2">
              <Users size={28} className="text-icon-hero transition-transform group-hover:scale-110" />
              <h3 className="text-lg font-semibold text-foreground">{t(UI_KEYS.nav.heroes)}</h3>
              <p className="text-xs text-text-muted">{site('heroesCardDesc')}</p>
            </div>
          </Link>

          <Link href="/artifacts" className="link-card group">
            <div className="flex flex-col items-center gap-2">
              <Shield size={28} className="text-icon-artifact transition-transform group-hover:scale-110" />
              <h3 className="text-lg font-semibold text-foreground">{t(UI_KEYS.nav.artifacts)}</h3>
              <p className="text-xs text-text-muted">{site('artifactsCardDesc')}</p>
            </div>
          </Link>

          <Link href="/companions" className="link-card group">
            <div className="flex flex-col items-center gap-2">
              <Sparkles size={28} className="text-icon-force transition-transform group-hover:scale-110" />
              <h3 className="text-lg font-semibold text-foreground">{t(UI_KEYS.nav.companions)}</h3>
              <p className="text-xs text-text-muted">{site('companionsCardDesc')}</p>
            </div>
          </Link>

          <Link href="/force-cards" className="link-card group">
            <div className="flex flex-col items-center gap-2">
              <Zap size={28} className="text-icon-force transition-transform group-hover:scale-110" />
              <h3 className="text-lg font-semibold text-foreground">{t(UI_KEYS.nav.forceCards)}</h3>
              <p className="text-xs text-text-muted">{site('forceCardsCardDesc')}</p>
            </div>
          </Link>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 border-b border-panel-border pb-2 text-lg font-semibold text-foreground">
            {t(UI_KEYS.nav.tools)}
          </h2>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/team-builder" className="btn-tool">
              <Wrench size={18} className="text-icon-tool" />
              <span>{t(UI_KEYS.nav.teamBuilder)}</span>
            </Link>
          </div>
        </section>

        <div className="mt-10 border-t border-panel-border pt-4">
          <p className="text-sm text-text-muted">
            {site('discordJoin')}{' '}
            <a
              href="https://discord.gg/JYSHChN5VM"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {site('discordLink')}
            </a>{' '}
            {site('discordAfter')}
          </p>
        </div>
      </div>
    </div>
  )
}
