'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys } from '@/lib/i18n/language-package'
import { applySkillValues, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import { useTeamStore } from '@/lib/team-builder/stores/use-team-store'
import GameImage from '@/components/ui/GameImage'
import { squareHeroHeadUrl } from '@/lib/assets/game-images'
import { useHeroHeadIconMap } from '@/hooks/use-hero-head-icons'

type HeroBasic = {
  id: number
  camp: number
  stance: number
  damagetype: number
  occupation: number
  quality?: number
}

export default function HeroPool({ heroes }: { heroes: HeroBasic[] }) {
  const { lang } = useLanguage()
  const { data: iconMap } = useHeroHeadIconMap()
  const { addHero, team } = useTeamStore()

  const [roleNameMap, setRoleNameMap] = useState<Record<number, string>>({})
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const getT = (key?: string) => translations[key || ''] || key || ''

  useEffect(() => setupGlobalSkillTooltips(), [])

  useEffect(() => {
    const loadNames = async () => {
      if (!heroes || heroes.length === 0) {
        setRoleNameMap({})
        setTranslations({})
        return
      }
      const translationKeys = new Set<string>()
      const resourceIds = heroes.map((h) => h.id * 10)

      const { data: resources } = await supabase
        .from('RoleResourcesConfig')
        .select('id, role_name')
        .in('id', resourceIds)

      const rMap: Record<number, string> = {}
      resources?.forEach((r) => {
        if (r.role_name) {
          rMap[r.id] = r.role_name
          translationKeys.add(r.role_name)
        }
      })
      setRoleNameMap(rMap)
      const translated = await translateKeys(Array.from(translationKeys), lang)
      setTranslations(translated)
    }
    loadNames()
  }, [heroes, lang])

  // 🔹 Filtra heróis já usados
  const availableHeroes = useMemo(() => {
    const selectedIds = new Set(team.map((h) => h.id))
    return heroes.filter((h) => !selectedIds.has(h.id))
  }, [heroes, team])

  const handleSelect = (hero: HeroBasic) => {
    addHero({ id: hero.id, stance: hero.stance })
  }

  const items = useMemo(() => {
    return availableHeroes.map((h) => {
      const resourceId = h.id * 10
      const name = getT(roleNameMap[resourceId])
      return { ...h, name, imageUrl: squareHeroHeadUrl(h.id, iconMap) }
    })
  }, [availableHeroes, roleNameMap, translations, iconMap])

  return (
    <div className="overflow-x-auto whitespace-nowrap py-3">
      {items.map((hero) => (
        <button
          key={hero.id}
          onClick={() => handleSelect(hero)}
          className="inline-block align-top mr-2 p-2 border border-panel-border rounded bg-panel hover:bg-panel-hover transition"
          title={hero.name}
        >
          <GameImage
            src={hero.imageUrl}
            alt={hero.name}
            className="w-20 h-20 rounded object-cover bg-panel-hover"
          />
          <p
            className="mt-1 text-[11px] text-text-muted font-semibold truncate w-20"
            dangerouslySetInnerHTML={{ __html: applySkillValues(hero.name, 0, {}) }}
          />
        </button>
      ))}
    </div>
  )
}
