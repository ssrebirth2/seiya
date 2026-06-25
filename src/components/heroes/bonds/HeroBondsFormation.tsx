'use client'

import Link from 'next/link'
import GameImage from '@/components/ui/GameImage'
import { circleHeroHeadUrl } from '@/lib/assets/game-images'
import type { HeroHeadIconMap } from '@/lib/game/fetch-hero-head-icons'

export type FormationRole = 'caster' | 'partner'

type HeroBondsFormationProps = {
  launcherId: number
  partnerIds: number[]
  profileHeroId: number
  iconMap?: HeroHeadIconMap
  localized: (path: string) => string
  casterLabel: string
  partnerLabel: string
}

export function HeroBondsFormation({
  launcherId,
  partnerIds,
  profileHeroId,
  iconMap,
  localized,
  casterLabel,
  partnerLabel,
}: HeroBondsFormationProps) {
  const slots = [
    { id: launcherId, role: 'caster' as const },
    ...partnerIds.filter((id) => id !== launcherId).map((id) => ({ id, role: 'partner' as const })),
  ]

  return (
    <div className="hero-bonds-formation" role="list" aria-label={casterLabel}>
      {slots.map((slot, index) => {
        const isProfileHero = slot.id === profileHeroId
        const roleLabel = slot.role === 'caster' ? casterLabel : partnerLabel

        return (
          <div key={`${slot.id}-${slot.role}`} className="hero-bonds-formation__slot-wrap">
            {index > 0 ? (
              <span className="hero-bonds-formation__link" aria-hidden>
                +
              </span>
            ) : null}

            <div
              className={`hero-bonds-formation__slot hero-bonds-formation__slot--${slot.role}${
                isProfileHero ? ' hero-bonds-formation__slot--self' : ''
              }`}
              role="listitem"
            >
              <Link
                href={localized(`/heroes/${slot.id}`)}
                className={`hero-bonds-portrait hero-bonds-portrait--${slot.role}${
                  isProfileHero ? ' hero-bonds-portrait--self' : ''
                }`}
                title={`Hero ${slot.id}`}
              >
                <GameImage
                  src={circleHeroHeadUrl(slot.id, iconMap)}
                  alt=""
                  aria-hidden
                  className="hero-bonds-portrait__img"
                  rawSrc={circleHeroHeadUrl(slot.id, iconMap)}
                />
              </Link>

              <span
                className={`hero-bonds-formation__badge hero-bonds-formation__badge--${slot.role}`}
              >
                {roleLabel}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
