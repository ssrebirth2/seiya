'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { translateKeys } from '@/lib/translate'
import { applySkillValues, setupGlobalSkillTooltips } from '@/lib/applySkillValues'

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

      // --- HEROES ---
      const { data: heroData } = await supabase
        .from('RoleConfig')
        .select('id, camp, stance, damagetype, occupation')
        .lte('id', 1499)
        .order('id')

      if (!heroData) return
      setHeroes(heroData)

      // --- ROLE NAMES ---
      const resourceIds = heroData.map((h) => h.id * 10)
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

      // --- TYPE MAPS ---
      const { data: types } = await supabase
        .from('HeroTypeDescConfig')
        .select('key, desc')

      const tMap: Record<string, string> = {}
      types?.forEach((t) => {
        tMap[t.key] = t.desc
        translationKeys.add(t.desc)
      })
      setTypeMap(tMap)

      // --- TRANSLATIONS ---
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
  }, [heroes, filters, translations, sortBy])

  const renderHTML = (text: string) => (
    <span
      dangerouslySetInnerHTML={{
        __html: applySkillValues(text, 0, {}),
      }}
    />
  )

  const renderSelect = (field: keyof typeof filters, label: string, options: number[]) => (
    <div className="flex flex-col text-sm min-w-[140px]">
      <label className="mb-1 text-[var(--text-muted)] font-medium">{label}</label>
      <select
        value={filters[field]}
        onChange={(e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }))}
        className="border p-1 rounded bg-[var(--panel)] border-[var(--panel-border)] focus:ring-1 focus:ring-[var(--panel-border)]"
      >
        <option value="">All</option>
        {options.map((val) => {
          const key = `${field}_${val}`
          const raw = typeMap[key]
          const html = applySkillValues(getT(raw), 0, {})
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
        <p className="text-sm text-[var(--text-muted)]">Loading hero data...</p>
      </div>
    )
  }

  return (
    <div className="panel animate-fadeIn">
      <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Hero List</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        {renderSelect('camp', 'Faction', [1, 2, 3, 4])}
        {renderSelect('stance', 'Position', [1, 2, 3])}
        {renderSelect('damagetype', 'Damage Type', [1, 2])}
        {renderSelect('occupation', 'Class', [1, 2, 3, 4, 5])}

        {/* Sort Filter */}
        <div className="flex flex-col text-sm min-w-[140px]">
          <label className="mb-1 text-[var(--text-muted)] font-medium">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'id' | 'name' | 'quality')}
            className="border p-1 rounded bg-[var(--panel)] border-[var(--panel-border)] focus:ring-1 focus:ring-[var(--panel-border)]"
          >
            <option value="id">ID</option>
            <option value="name">Name</option>
            <option value="quality">Quality</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex flex-col text-sm">
          <label className="mb-1 text-[var(--text-muted)] font-medium">Search by Name</label>
          <input
            type="text"
            placeholder="Hero name..."
            className="border p-1 rounded bg-[var(--panel)] border-[var(--panel-border)] focus:ring-1 focus:ring-[var(--panel-border)]"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>

        <button
          onClick={resetFilters}
          className="px-3 py-1 rounded text-sm border border-[var(--panel-border)] bg-[var(--panel)] hover:bg-[var(--panel-hover)] transition"
        >
          Clear Filters
        </button>
      </div>

      <p className="text-sm text-[var(--text-muted)] mb-3">
        {processedHeroes.length} hero{processedHeroes.length !== 1 && 'es'} found
      </p>

      {processedHeroes.length === 0 ? (
        <p className="text-center text-[var(--text-muted)] py-10">
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
            const imageUrl = `/assets/resources/textures/hero/squareherohead/SquareHeroHead_${id}0.png`

            return (
              <Link
                key={id}
                href={`/heroes/${id}`}
                className="shadow-md p-3 bg-[var(--panel)] hover:bg-[var(--panel-hover)] transition duration-200 text-center border border-[var(--panel-border)] rounded-md"
              >
                <img
                  src={imageUrl}
                  alt={name}
                  className="mx-auto w-32 h-32 rounded-md mb-2 object-cover"
                />
                <p
                  className="font-semibold text-sm mb-1"
                  dangerouslySetInnerHTML={{
                    __html: applySkillValues(name, 0, {}),
                  }}
                />
                <p className="text-xs text-[var(--text-muted)] leading-snug">
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
    </div>
  )
}
