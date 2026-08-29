'use client'

import { HeroProfileHeader } from '@/components/heroes/HeroProfileHeader'
import { StageUpRangeSlider } from '@/components/stage-up/StageUpRangeSlider'
import { Surface } from '@/components/ui/v2'
import type { HeroHeadIconMap } from '@/lib/game/fetch-hero-head-icons'
import type { StageUpHeroBundle } from '@/lib/game/load-stage-up-bundle'
import { applyLcPlaceholders } from '@/lib/game/format-cosmo-unlock'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type StageUpControlsProps = {
  bundle: StageUpHeroBundle
  iconMap?: HeroHeadIconMap
  heroName: string
  camp: number
  stance: number
  damagetype: number
  occupation: number
  typeMap: Record<string, string>
  getT: (key: string | undefined) => string
  fromStage: number
  toStage: number
  onRangeChange: (from: number, to: number) => void
}

export function StageUpControls({
  bundle,
  iconMap,
  heroName,
  camp,
  stance,
  damagetype,
  occupation,
  typeMap,
  getT,
  fromStage,
  toStage,
  onRangeChange,
}: StageUpControlsProps) {
  const { t, site } = useUiTranslation()
  const heading = applyLcPlaceholders(t(UI_KEYS.stageUp.replacementStage), ['']).trim()

  return (
    <>
      <HeroProfileHeader
        heroId={bundle.heroId}
        nameHtml={heroName}
        quality={bundle.baseQuality}
        camp={camp}
        stance={stance}
        damagetype={damagetype}
        occupation={occupation}
        typeMap={typeMap}
        getT={getT}
        iconMap={iconMap}
        headingAs="h2"
      />
      <Surface as="section" className="stage-up-range-panel">
        <h2 className="stage-up-plan__title font-display">{heading}</h2>
        <StageUpRangeSlider
          max={bundle.maxStage}
          from={fromStage}
          to={toStage}
          fromLabel={site('fromStage')}
          toLabel={site('toStage')}
          onChange={onRangeChange}
        />
      </Surface>
    </>
  )
}
