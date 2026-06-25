'use client'

import type { ReactNode } from 'react'
import { HeroBondsFormation } from './HeroBondsFormation'
import type { HeroHeadIconMap } from '@/lib/game/fetch-hero-head-icons'

export type ComboParticipation = 'caster' | 'partner'

type HeroBondsComboCardProps = {
  comboName: string
  launcherId: number
  partnerIds: number[]
  profileHeroId: number
  participation: ComboParticipation
  partnerHint: string
  casterLabel: string
  partnerLabel: string
  iconMap?: HeroHeadIconMap
  localized: (path: string) => string
  skillPanel: ReactNode
}

export function HeroBondsComboCard({
  comboName,
  launcherId,
  partnerIds,
  profileHeroId,
  participation,
  partnerHint,
  casterLabel,
  partnerLabel,
  iconMap,
  localized,
  skillPanel,
}: HeroBondsComboCardProps) {
  return (
    <article
      className={`hero-bonds-combo hero-bonds-combo--${participation}${
        participation === 'partner' ? ' hero-bonds-combo--support' : ''
      }`}
    >
      {participation === 'partner' ? (
        <p className="hero-bonds-combo__participation">{partnerHint}</p>
      ) : null}

      <header className="hero-bonds-combo__header">
        <h3 className="hero-bonds-combo__name">{comboName}</h3>
      </header>

      <HeroBondsFormation
        launcherId={launcherId}
        partnerIds={partnerIds}
        profileHeroId={profileHeroId}
        iconMap={iconMap}
        localized={localized}
        casterLabel={casterLabel}
        partnerLabel={partnerLabel}
      />

      <div className="hero-bonds-combo__skill">{skillPanel}</div>
    </article>
  )
}
