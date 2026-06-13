'use client'

import Link from 'next/link'
import { FunctionShortcutGrid } from '@/components/ui/v2/FunctionShortcutGrid'
import { useLanguage } from '@/context/language-context'
import { getSiteLogoSpec } from '@/lib/i18n/site-logo'
import { HOME_SHORTCUTS } from '@/lib/navigation/function-shortcuts'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'

export default function Home() {
  const { lang } = useLanguage()
  const { site } = useUiTranslation()
  const siteLogoSpec = getSiteLogoSpec(lang)
  const siteLogoHeight = Math.round(
    siteLogoSpec.displayWidth * (siteLogoSpec.height / siteLogoSpec.width)
  )

  return (
    <div className="home-page -mx-4 -mt-4 animate-slideUp sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-6">
      <section className="home-page__hero home-hero-bg relative overflow-hidden px-4 pt-2 pb-2 sm:px-8 sm:pt-8 sm:pb-14 lg:px-12 lg:pt-4 lg:pb-16">
        <Link
          href="/"
          className={`home-hero-logo lg:hidden ${lang === 'CN' ? 'home-hero-logo--cn' : ''}`}
          aria-label="SSRB2 Database home"
          aria-current="page"
        >
          <img
            src={siteLogoSpec.src}
            alt=""
            className="home-hero-logo__img"
            width={siteLogoSpec.width}
            height={siteLogoSpec.height}
            style={{ width: siteLogoSpec.displayWidth, height: siteLogoHeight }}
            decoding="async"
          />
        </Link>

        <div className="home-page__copy relative mx-auto max-w-4xl text-center sm:mt-10 lg:mt-10">
          <p className="home-page__eyebrow mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent sm:mb-3">
            DATABASE
          </p>
          <h1 className="home-page__title mb-4 font-display text-4xl font-bold tracking-tight text-foreground sm:mb-4 sm:text-6xl">
            {site('databaseTitle')}
          </h1>
          <p className="home-page__welcome mx-auto max-w-2xl text-base leading-relaxed text-text-muted sm:text-lg">
            {site('databaseWelcome')}
          </p>
        </div>
      </section>

      <section className="home-page__shortcuts mx-auto max-w-7xl px-4 pb-2 sm:px-8 sm:py-10 lg:px-12 lg:py-10">
        <FunctionShortcutGrid items={HOME_SHORTCUTS} variant="home" />
      </section>
    </div>
  )
}
