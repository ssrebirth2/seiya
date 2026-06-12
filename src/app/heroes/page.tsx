'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { applySkillValues, formatDisplayText, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import { getQueryClient } from '@/lib/query/query-client'
import { fetchHeroTypeDescMap } from '@/lib/game/hero-type-desc'
import { queryKeys } from '@/lib/query/query-keys'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import GameImage from '@/components/ui/GameImage'
import { squareHeroHeadUrl } from '@/lib/assets/game-images'
import { useHeroHeadIconMap } from '@/hooks/use-hero-head-icons'
import { isHeroListed } from '@/lib/game/hidden-hero-ids'

interface Hero {
  id: number
  camp: number
  stance: number
  damagetype: number
  occupation: number
}

export default function HeroListPage() {
  const { lang } = useLanguage()
  const { t, site, noData } = useUiTranslation()
  const { data: iconMap } = useHeroHeadIconMap()
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [typeMap, setTypeMap] = useState<Record<string, string>>({})
  const [roleNameMap, setRoleNameMap] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({
    camp: '',
    stance: '',
    damagetype: '',
    occupation: '',
    search: '',
  })

  const [sortBy, setSortBy] = useState<'id' | 'name' | 'quality'>('id')

  const getT = useMemo(() => createTranslationGetter(translations), [translations])

  useEffect(() => {
    setupGlobalSkillTooltips()
  }, [])

  useEffect(() => {
    const loadData = async () => {
      const translationKeys = new Set<string>()
      const qc = getQueryClient()

      const [{ data: heroData }, tMap] = await Promise.all([
        supabase
          .from('RoleConfig')
          .select('id, camp, stance, damagetype, occupation')
          .lte('id', 1499)
          .order('id'),
        qc.fetchQuery({
          queryKey: queryKeys.heroTypeDesc,
          queryFn: fetchHeroTypeDescMap,
          staleTime: GAME_CONFIG_STALE_MS,
        }),
      ])

      if (!heroData) return

      const visibleHeroes = heroData.filter((h) => isHeroListed(h.id))
      setHeroes(visibleHeroes)

      const resourceIds = visibleHeroes.map((h) => h.id * 10)
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

      Object.values(tMap).forEach((desc) => translationKeys.add(desc))
      setTypeMap(tMap)

      const translationMap = await translateKeys(Array.from(translationKeys), lang)
      setTranslations(translationMap)
      setLoading(false)
    }

    loadData()
  }, [lang])

  const processedHeroes = useMemo(() => {
    let result = heroes.filter((hero) => {
      const match = (field: keyof typeof filters, value: number) =>
        !filters[field] || filters[field] === String(value)

      const matchesFilters =
        match('camp', hero.camp) &&
        match('stance', hero.stance) &&
        match('damagetype', hero.damagetype) &&
        match('occupation', hero.occupation)

      if (!matchesFilters) return false

      const name = getT(roleNameMap[hero.id * 10]).toLowerCase()
      const search = filters.search.toLowerCase()
      return name.includes(search)
    })

    result = result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return getT(roleNameMap[a.id * 10]).localeCompare(getT(roleNameMap[b.id * 10]))
        case 'quality':
          return (b.occupation ?? 0) - (a.occupation ?? 0)
        case 'id':
        default:
          return a.id - b.id
      }
    })

    return result
  }, [heroes, filters, translations, sortBy, roleNameMap, getT])

  const renderHTML = (text: string) => (
    <span
      className="text-foreground"
      dangerouslySetInnerHTML={{
        __html: formatDisplayText(text, 0, {}),
      }}
    />
  )

  const renderSelect = (field: keyof typeof filters, label: string, options: number[]) => (
    <div className="flex min-w-[140px] flex-col text-sm">
      <label className="field-label">{label}</label>
      <select
        value={filters[field]}
        onChange={(e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }))}
        className="control-input"
      >
        <option value="">{t(UI_KEYS.filter.all)}</option>
        {options.map((val) => {
          const key = `${field}_${val}`
          const raw = typeMap[key]
          const html = formatDisplayText(getT(raw), 0, {})
          return <option key={val} value={val} dangerouslySetInnerHTML={{ __html: html }} />
        })}
      </select>
    </div>
  )

  const resetFilters = () => {
    setFilters({ camp: '', stance: '', damagetype: '', occupation: '', search: '' })
  }

  if (loading) {
    return (
      <div className="panel py-8 text-center">
        <p className="text-sm text-text-muted">{site('loadingHero')}</p>
      </div>
    )
  }

  return (
    <ListPagePanel>
      <h2 className="mb-4 text-xl font-bold uppercase tracking-wide">
        {t(UI_KEYS.list.heroGallery)}
      </h2>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        {renderSelect('camp', t(UI_KEYS.filter.faction), [1, 2, 3, 4])}
        {renderSelect('stance', t(UI_KEYS.filter.position), [1, 2, 3])}
        {renderSelect('damagetype', t(UI_KEYS.filter.damageType), [1, 2])}
        {renderSelect('occupation', t(UI_KEYS.filter.class), [1, 2, 3, 4, 5])}

        <div className="flex min-w-[140px] flex-col text-sm">
          <label className="field-label">{site('sortBy')}</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'id' | 'name' | 'quality')}
            className="control-input"
          >
            <option value="id">{site('id')}</option>
            <option value="name">{site('name')}</option>
            <option value="quality">{t(UI_KEYS.common.quality)}</option>
          </select>
        </div>

        <div className="flex flex-col text-sm">
          <label className="field-label">{site('searchByName')}</label>
          <input
            type="text"
            placeholder={site('searchPlaceholderHero')}
            className="control-input"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>

        <button type="button" onClick={resetFilters} className="btn-secondary">
          {t(UI_KEYS.filter.clearAll)}
        </button>
      </div>

      <p className="mb-3 text-sm text-text-muted">
        {processedHeroes.length} {site('found')}
      </p>

      {processedHeroes.length === 0 ? (
        <p className="py-10 text-center text-text-muted">{t(UI_KEYS.filter.emptyHeroes)}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {processedHeroes.map((hero) => {
            const id = hero.id
            const resourceId = id * 10
            const name = getT(roleNameMap[resourceId])
            const camp = getT(typeMap[`camp_${hero.camp}`])
            const stance = getT(typeMap[`stance_${hero.stance}`])
            const dmg = getT(typeMap[`damagetype_${hero.damagetype}`])
            const occ = getT(typeMap[`occupation_${hero.occupation}`])
            return (
              <Link key={id} href={`/heroes/${id}`} className="catalog-card-link">
                <GameImage
                  src={squareHeroHeadUrl(id, iconMap)}
                  alt={name === noData ? site('name') : name}
                  className="mx-auto mb-2 h-32 w-32 rounded-md bg-panel-hover object-cover"
                />
                <p
                  className="mb-1 text-sm font-semibold"
                  dangerouslySetInnerHTML={{
                    __html: applySkillValues(name, 0, {}),
                  }}
                />
                <p className="text-xs leading-snug text-text-muted">
                  {renderHTML(occ)} <br />
                  {renderHTML(stance)} <br />
                  {renderHTML(dmg)} <br />
                  {renderHTML(camp)}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </ListPagePanel>
  )
}
