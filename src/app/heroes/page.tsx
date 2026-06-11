'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys } from '@/lib/i18n/language-package'
import { applySkillValues, formatDisplayText, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import { getQueryClient } from '@/lib/query/query-client'
import { fetchHeroTypeDescMap } from '@/lib/game/hero-type-desc'
import { queryKeys } from '@/lib/query/query-keys'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import GameImage from '@/components/ui/GameImage'
import { squareHeroHeadUrl } from '@/lib/assets/game-images'
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

  // Novo estado de ordenação
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'quality'>('id')

  const getT = (key?: string) => translations[key || ''] || key || ''

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

  // 🔹 Filtragem + Ordenação
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

    // 🔸 Ordenação
    result = result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return getT(roleNameMap[a.id * 10]).localeCompare(getT(roleNameMap[b.id * 10]))
        case 'quality':
          // Ordenação por "qualidade" — simulação com occupation como exemplo
          return (b.occupation ?? 0) - (a.occupation ?? 0)
        case 'id':
        default:
          return a.id - b.id
      }
    })

    return result
  }, [heroes, filters, translations, sortBy, roleNameMap, typeMap])

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
        <option value="">All</option>
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
      <div className="panel text-center py-8">
        <p className="text-sm text-text-muted">Loading hero data...</p>
      </div>
    )
  }

  return (
    <ListPagePanel>
      <h2 className="mb-4 text-xl font-bold uppercase tracking-wide">Hero List</h2>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        {renderSelect('camp', 'Faction', [1, 2, 3, 4])}
        {renderSelect('stance', 'Position', [1, 2, 3])}
        {renderSelect('damagetype', 'Damage Type', [1, 2])}
        {renderSelect('occupation', 'Class', [1, 2, 3, 4, 5])}

        {/* Sort Filter */}
        <div className="flex min-w-[140px] flex-col text-sm">
          <label className="field-label">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'id' | 'name' | 'quality')}
            className="control-input"
          >
            <option value="id">ID</option>
            <option value="name">Name</option>
            <option value="quality">Quality</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex flex-col text-sm">
          <label className="field-label">Search by Name</label>
          <input
            type="text"
            placeholder="Hero name..."
            className="control-input"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>

        <button type="button" onClick={resetFilters} className="btn-secondary">
          Clear Filters
        </button>
      </div>

      <p className="mb-3 text-sm text-text-muted">
        {processedHeroes.length} hero{processedHeroes.length !== 1 && 'es'} found
      </p>

      {processedHeroes.length === 0 ? (
        <p className="py-10 text-center text-text-muted">
          No heroes match your filters.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {processedHeroes.map((hero) => {
            const id = hero.id
            const resourceId = id * 10
            const name = getT(roleNameMap[resourceId])
            const camp = getT(typeMap[`camp_${hero.camp}`])
            const stance = getT(typeMap[`stance_${hero.stance}`])
            const dmg = getT(typeMap[`damagetype_${hero.damagetype}`])
            const occ = getT(typeMap[`occupation_${hero.occupation}`])
            return (
              <Link
                key={id}
                href={`/heroes/${id}`}
                className="catalog-card-link"
              >
                <GameImage
                  src={squareHeroHeadUrl(id)}
                  alt={name}
                  className="mx-auto w-32 h-32 rounded-md mb-2 object-cover bg-panel-hover"
                />
                <p
                  className="font-semibold text-sm mb-1"
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
