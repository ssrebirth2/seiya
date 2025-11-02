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

  const getT = (key?: string) => translations[key || ''] || key || ''

  useEffect(() => {
    // 🔹 ativa tooltips globais uma única vez
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

      // --- TYPE MAPS (camp, stance, dmg, occupation) ---
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

  const filteredHeroes = useMemo(() => {
    return heroes.filter((hero) => {
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
  }, [heroes, filters, translations])

  /** Renderiza HTML seguro */
  const renderHTML = (text: string) => (
    <span
      dangerouslySetInnerHTML={{
        __html: applySkillValues(text, 0, {}),
      }}
    />
  )

  /** Renderiza select */
  const renderSelect = (field: keyof typeof filters, label: string, options: number[]) => (
    <div className="flex flex-col text-sm">
      <label className="mb-1 text-[var(--text-muted)]">{label}</label>
      <select
        value={filters[field]}
        onChange={(e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }))}
        className="border p-1 rounded bg-[var(--panel)] border-[var(--panel-border)]"
      >
        <option value="">Todos</option>
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
      <div className="panel">
        <p className="text-sm text-[var(--text-muted)]">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="panel">
      <h2 className="text-xl font-bold mb-4">Lista de Personagens</h2>

      <div className="flex flex-wrap gap-4 mb-6 items-end">
        {renderSelect('camp', 'Facção', [1, 2, 3, 4])}
        {renderSelect('stance', 'Posição', [1, 2, 3])}
        {renderSelect('damagetype', 'Tipo de Dano', [1, 2])}
        {renderSelect('occupation', 'Classe', [1, 2, 3, 4, 5])}

        <div className="flex flex-col text-sm">
          <label className="mb-1 text-[var(--text-muted)]">Buscar por Nome</label>
          <input
            type="text"
            placeholder="Nome do herói"
            className="border p-1 rounded bg-[var(--panel)] border-[var(--panel-border)]"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>

        <button
          onClick={resetFilters}
          className="px-3 py-1 rounded text-sm border border-[var(--panel-border)] bg-[var(--panel)] hover:bg-[var(--panel-hover)]"
        >
          Limpar Filtros
        </button>
      </div>

      <p className="text-sm text-[var(--text-muted)] mb-2">
        {filteredHeroes.length} personagem(ns) encontrado(s)
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {filteredHeroes.map((hero) => {
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
              className="shadow-md p-3 bg-[var(--panel)] hover:bg-[var(--panel-hover)] transition duration-200 text-center border border-[var(--panel-border)]"
            >
              <img
                src={imageUrl}
                alt={name}
                className="mx-auto w-144 h-144"
              />

              <p
                className="font-semibold text-base"
                dangerouslySetInnerHTML={{
                  __html: applySkillValues(name, 0, {}),
                }}
              />

              <p className="text-xs text-[var(--text-muted)] leading-snug">
                {renderHTML(occ)}
                <br />
                {renderHTML(stance)}
                <br />
                {renderHTML(dmg)}
                <br />
                {renderHTML(camp)}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
