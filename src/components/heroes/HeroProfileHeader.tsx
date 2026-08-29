'use client'

import type { ReactNode } from 'react'
import GameImage from '@/components/ui/GameImage'
import { isAssetAvailable } from '@/lib/assets/asset-registry'
import {
  IMAGE_UNAVAILABLE,
  superSkillBannerPath,
  superSkillBannerUrl,
} from '@/lib/assets/game-images'
import { useLanguage } from '@/context/language-context'
import { formatPlainLabel } from '@/lib/game/apply-skill-values'
import { getHeroSquareHeadUrl, type HeroHeadIconMap } from '@/lib/game/fetch-hero-head-icons'
import { HERO_TYPE_FIELDS, heroTypeDescKey, heroTypeIconPath } from '@/lib/game/hero-type-fields'
import {
  getQualityIconClassName,
  getQualityIconPath,
} from '@/lib/game/hero-ui-sprites'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { qualityNameKey } from '@/lib/i18n/ui-keys'

type HeroProfileHeaderProps = {
  heroId: number
  nameHtml: string
  quality: number
  camp: number
  stance: number
  damagetype: number
  occupation: number
  typeMap: Record<string, string>
  getT: (key: string | undefined) => string
  iconMap?: HeroHeadIconMap
  headingAs?: 'h1' | 'h2'
  className?: string
  children?: ReactNode
}

export function HeroProfileHeader({
  heroId,
  nameHtml,
  quality,
  camp,
  stance,
  damagetype,
  occupation,
  typeMap,
  getT,
  iconMap,
  headingAs = 'h1',
  className = '',
  children,
}: HeroProfileHeaderProps) {
  const { lang } = useLanguage()
  const { t } = useUiTranslation()
  const values: Record<(typeof HERO_TYPE_FIELDS)[number], number> = {
    occupation,
    camp,
    stance,
    damagetype,
  }
  const headIconUrl = getHeroSquareHeadUrl(iconMap, heroId)
  const hasHeadIcon = headIconUrl !== IMAGE_UNAVAILABLE
  const bannerPath = superSkillBannerPath(heroId)
  const bannerUrl = superSkillBannerUrl(heroId)
  const hasBannerArt = isAssetAvailable(bannerPath)
  const qualityLabel = formatPlainLabel(t(qualityNameKey(quality)))
  const qualityIconSrc = getQualityIconPath(quality, quality)
  const qualityIconClass = getQualityIconClassName(quality, quality)
  const NameTag = headingAs

  const metaIcons = HERO_TYPE_FIELDS.flatMap((field) => {
    const value = values[field]
    const src = heroTypeIconPath(field, value, lang)
    const lc = typeMap[heroTypeDescKey(field, value)]
    const label = lc ? formatPlainLabel(getT(lc)) : ''
    if (!src || !label) return []
    return [{ key: field, src, label }]
  })

  return (
    <section className={`profile-header ${className}`.trim()}>
      {hasBannerArt ? (
        <>
          <div
            className="pointer-events-none absolute -right-6 top-1/2 z-0 h-40 w-40 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl sm:h-56 sm:w-56"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[min(72%,17.5rem)] sm:w-[min(58%,22rem)] md:w-[min(50%,26rem)]"
            aria-hidden
          >
            <GameImage
              src={bannerUrl}
              rawSrc={bannerPath}
              alt=""
              aria-hidden
              className="profile-header-art absolute bottom-0 right-0 h-[118%] w-auto max-w-[135%] object-contain object-right-bottom"
            />
          </div>
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-panel from-35% via-panel/85 to-transparent"
            aria-hidden
          />
        </>
      ) : null}

      <div className="relative z-10 px-4 py-4 sm:px-7 sm:py-5">
        <div className="hero-profile-header__row">
          {hasHeadIcon ? (
            <GameImage src={headIconUrl} alt={formatPlainLabel(nameHtml)} className="hero-profile-head" />
          ) : null}

          <div className="hero-profile-header__body">
            <div className="hero-profile-header__topline">
              {qualityIconSrc ? (
                <GameImage
                  src={qualityIconSrc}
                  alt={qualityLabel || t(UI_KEYS.common.quality)}
                  title={qualityLabel || undefined}
                  className={`hero-profile-quality ${qualityIconClass}`.trim()}
                />
              ) : null}
              <span className="hero-profile-header__id">ID {heroId}</span>
            </div>
            <NameTag
              className="hero-profile-header__name font-display"
              dangerouslySetInnerHTML={{ __html: nameHtml }}
            />

            {metaIcons.length > 0 ? (
              <ul className="hero-profile-meta" aria-label={t(UI_KEYS.common.detail)}>
                {metaIcons.map((icon) => (
                  <li key={icon.key}>
                    <GameImage
                      src={icon.src}
                      alt={icon.label}
                      title={icon.label}
                      className="hero-profile-meta__icon"
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
