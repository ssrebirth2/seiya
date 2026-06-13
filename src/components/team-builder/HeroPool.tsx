'use client'

import { useEffect, useMemo } from 'react'
import { setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import { useTeamStore } from '@/lib/team-builder/stores/use-team-store'
import { useHeroHeadIconMap } from '@/hooks/use-hero-head-icons'
import { SquareHeroItem } from '@/components/heroes/SquareHeroItem'

type HeroBasic = {
  id: number
  camp: number
  stance: number
  damagetype: number
  occupation: number
  quality: number
}

export default function HeroPool({ heroes }: { heroes: HeroBasic[] }) {
  const { data: iconMap } = useHeroHeadIconMap()
  const { addHero, team } = useTeamStore()

  useEffect(() => setupGlobalSkillTooltips(), [])

  const availableHeroes = useMemo(() => {
    const selectedIds = new Set(team.map((h) => h.id))
    return heroes.filter((h) => !selectedIds.has(h.id))
  }, [heroes, team])

  return (
    <div className="team-builder-pool__heroes scroll-strip-h">
      <div className="team-builder-pool__heroes-inner">
        {availableHeroes.map((hero) => (
          <SquareHeroItem
            key={hero.id}
            heroId={hero.id}
            camp={hero.camp}
            stance={hero.stance}
            damagetype={hero.damagetype}
            quality={hero.quality}
            iconMap={iconMap}
            showName={false}
            onClick={() => addHero({ id: hero.id, stance: hero.stance })}
          />
        ))}
      </div>
    </div>
  )
}
