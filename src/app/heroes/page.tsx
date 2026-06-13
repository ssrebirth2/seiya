'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { applySkillValues, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import { getQueryClient } from '@/lib/query/query-client'
import { fetchHeroTypeDescMap } from '@/lib/game/hero-type-desc'
import { queryKeys } from '@/lib/query/query-keys'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import { useHeroHeadIconMap } from '@/hooks/use-hero-head-icons'
import { isHeroListed } from '@/lib/game/hidden-hero-ids'
import { SquareHeroItem } from '@/components/heroes/SquareHeroItem'
import { HeroIconFilterBar, type HeroListFilters } from '@/components/heroes/HeroIconFilterBar'
import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
} from '@/components/ui/v2'

interface Hero {
  id: number
  camp: number
  stance: number
  damagetype: number
  occupation: number
  quality: number
}

export default function HeroListPage() {
  const { lang } = useLanguage()
  const { t } = useUiTranslation()
  const { data: iconMap } = useHeroHeadIconMap()
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [typeMap, setTypeMap] = useState<Record<string, string>>({})
  const [roleNameMap, setRoleNameMap] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [catalogReady, setCatalogReady] = useState(false)

  const [filters, setFilters] = useState<HeroListFilters>({
    camp: '',
    stance: '',
    damagetype: '',
    occupation: '',
    quality: '',
    search: '',
  })

  const getT = useMemo(() => createTranslationGetter(translations, { lang }), [translations, lang])

  useEffect(() => {
    setupGlobalSkillTooltips()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const q = new URLSearchParams(window.location.search).get('search')
    if (q) setFilters((prev) => ({ ...prev, search: q }))
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadCatalog = async () => {
      setLoading(true)
      const translationKeys = new Set<string>()
      const qc = getQueryClient()

      const [{ data: heroData }, tMap] = await Promise.all([
        supabase
          .from('RoleConfig')
          .select('id, camp, stance, damagetype, occupation, quality')
          .lte('id', 1499)
          .order('id'),
        qc.fetchQuery({
          queryKey: queryKeys.heroTypeDesc,
          queryFn: fetchHeroTypeDescMap,
          staleTime: GAME_CONFIG_STALE_MS,
        }),
      ])

      if (cancelled || !heroData) return

      const visibleHeroes = heroData.filter((h) => isHeroListed(h.id))
      setHeroes(visibleHeroes)

      const resourceIds = visibleHeroes.map((h) => h.id * 10)
      const { data: resources } = await supabase
        .from('RoleResourcesConfig')
        .select('id, role_name')
        .in('id', resourceIds)

      if (cancelled) return

      const rMap: Record<number, string> = {}
      resources?.forEach((r) => {
        if (r.role_name) {
          rMap[r.id] = r.role_name
          translationKeys.add(r.role_name)
        }
      })
      setRoleNameMap(rMap)
      Object.values(tMap).forEach((desc) => translationKeys.add(desc))
      setTypeMap(tMap)
      setCatalogReady(true)
      setLoading(false)
    }

    loadCatalog()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!catalogReady) return
    let cancelled = false

    const retranslate = async () => {
      const translationKeys = new Set<string>()
      Object.values(roleNameMap).forEach((k) => translationKeys.add(k))
      Object.values(typeMap).forEach((k) => translationKeys.add(k))
      const translationMap = await translateKeys(Array.from(translationKeys), lang)
      if (!cancelled) setTranslations(translationMap)
    }

    retranslate()
    return () => {
      cancelled = true
    }
  }, [lang, catalogReady, roleNameMap, typeMap])

  const processedHeroes = useMemo(() => {
    let result = heroes.filter((hero) => {
      const match = (field: keyof typeof filters, value: number) =>
        !filters[field] || filters[field] === String(value)

      const matchesFilters =
        match('camp', hero.camp) &&
        match('stance', hero.stance) &&
        match('damagetype', hero.damagetype) &&
        match('occupation', hero.occupation) &&
        match('quality', hero.quality)

      if (!matchesFilters) return false

      const name = getT(roleNameMap[hero.id * 10]).toLowerCase()
      const search = filters.search.toLowerCase()
      return name.includes(search)
    })

    result = result.sort((a, b) => a.id - b.id)

    return result
  }, [heroes, filters, roleNameMap, getT])

  const handleFilterChange = (field: keyof HeroListFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <ListPagePanel>
        <LoadingSkeleton variant="filters" />
        <LoadingSkeleton variant="grid" />
      </ListPagePanel>
    )
  }

  return (
    <ListPagePanel>
      <PageHeader title={t(UI_KEYS.list.heroGallery)} />

      <HeroIconFilterBar
        filters={filters}
        onChange={handleFilterChange}
        typeMap={typeMap}
        getT={getT}
        resultCount={processedHeroes.length}
      />

      {processedHeroes.length === 0 ? (
        <EmptyState message={t(UI_KEYS.filter.emptyHeroes)} />
      ) : (
        <div className="hero-catalog-grid">
          {processedHeroes.map((hero) => {
            const id = hero.id
            const resourceId = id * 10
            const name = getT(roleNameMap[resourceId])
            return (
              <SquareHeroItem
                key={id}
                heroId={id}
                camp={hero.camp}
                stance={hero.stance}
                damagetype={hero.damagetype}
                quality={hero.quality}
                iconMap={iconMap}
                href={`/heroes/${id}`}
                name={
                  <span
                    dangerouslySetInnerHTML={{
                      __html: applySkillValues(name, 0, {}),
                    }}
                  />
                }
              />
            )
          })}
        </div>
      )}
    </ListPagePanel>
  )
}
