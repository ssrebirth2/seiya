'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { translateKeys } from '@/lib/translate'
import { applySkillValues, setupGlobalSkillTooltips } from '@/lib/applySkillValues'
import { useTeamStore } from './useTeamStore'

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
      const imageUrl = `/assets/resources/textures/hero/squareherohead/SquareHeroHead_${h.id}0.png`
      return { ...h, name, imageUrl }
    })
  }, [availableHeroes, roleNameMap, translations])

  return (
    <div className="overflow-x-auto whitespace-nowrap py-3">
      {items.map((hero) => (
        <button
          key={hero.id}
          onClick={() => handleSelect(hero)}
          className="inline-block align-top mr-2 p-2 border border-[var(--panel-border)] rounded bg-[var(--panel)] hover:bg-[var(--panel-hover)] transition"
          title={hero.name}
        >
          <img
            src={hero.imageUrl}
            alt={hero.name}
            className="w-20 h-20 rounded object-cover"
          />
          <p
            className="mt-1 text-[11px] text-[var(--text-muted)] font-semibold truncate w-20"
            dangerouslySetInnerHTML={{ __html: applySkillValues(hero.name, 0, {}) }}
          />
        </button>
      ))}
    </div>
  )
}
