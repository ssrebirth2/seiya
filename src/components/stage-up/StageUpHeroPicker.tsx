'use client'

import { SquareHeroItem } from '@/components/heroes/SquareHeroItem'
import { EmptyState } from '@/components/ui/v2'
import type { HeroHeadIconMap } from '@/lib/game/fetch-hero-head-icons'
import type { StageUpCatalogHero } from '@/lib/game/load-stage-up-bundle'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

export type StageUpPickerHero = StageUpCatalogHero & {
  name: string
}

type StageUpHeroPickerProps = {
  heroes: StageUpPickerHero[]
  selectedId: number | null
  iconMap?: HeroHeadIconMap
  onSelect: (heroId: number) => void
}

export function StageUpHeroPicker({
  heroes,
  selectedId,
  iconMap,
  onSelect,
}: StageUpHeroPickerProps) {
  const { t } = useUiTranslation()

  if (heroes.length === 0) {
    return <EmptyState message={t(UI_KEYS.filter.emptyHeroes)} />
  }

  return (
    <div className="team-builder-pool__heroes scroll-strip-h">
      <div className="team-builder-pool__heroes-inner">
        {heroes.map((hero) => (
          <SquareHeroItem
            key={hero.id}
            heroId={hero.id}
            camp={hero.camp}
            stance={hero.stance}
            damagetype={hero.damagetype}
            quality={hero.quality}
            iconMap={iconMap}
            showName={false}
            className={selectedId === hero.id ? 'stage-up-picker__hero--selected' : ''}
            onClick={() => onSelect(hero.id)}
          />
        ))}
      </div>
    </div>
  )
}
