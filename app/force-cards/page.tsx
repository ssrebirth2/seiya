'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { translateKeys } from '@/lib/translate'

interface ForceCard {
  id: number
  name: string
  desc: string
  icon_path?: string
  icon_samll_path?: string
  quality: number
  star?: number
  type?: number
  child_type?: string
  sort_weight?: number
}

export default function ForceCardListPage() {
  const { lang } = useLanguage()
  const [cards, setCards] = useState<ForceCard[]>([])
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({
    quality: '',
    search: '',
  })
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'quality'>('id')

  const getT = (key?: string) => translations[key || ''] || key || ''

  // ✅ Corrigido: agora recebe o ID da carta
  const resolveIcon = (id: number, path?: string): string =>
    path
      ? `/assets/resources/textures/dynamis/card/Card_small_${id}.png`
      : '/assets/resources/textures/dynamis/card/ItemIcon_10000.png' // placeholder quando não há caminho

  // Load cards and translations
  useEffect(() => {
    const loadData = async () => {
      const { data, error } = await supabase
        .from('ForceCardItemConfig')
        .select('id,name,desc,icon_path,icon_samll_path,quality,star,type,child_type,sort_weight')
        .order('sort_weight', { ascending: false })

      if (!data || error) return

      const adjusted = data.map((c: ForceCard) => ({
        ...c,
        quality:
          typeof c.quality === 'number' ? c.quality : Number(c.quality) || 0,
      }))

      const keys = new Set<string>()
      adjusted.forEach((c) => {
        if (c.name) keys.add(c.name)
        if (c.desc) keys.add(c.desc)
        if (c.quality)
          keys.add(`LC_COMMON_force_card_quality_quality_name_${c.quality}`)
      })

      const translated = await translateKeys(Array.from(keys), lang)
      setCards(adjusted)
      setTranslations(translated)
      setLoading(false)
    }

    loadData()
  }, [lang])

  const processedCards = useMemo(() => {
    let result = cards.filter((c) => {
      const matchesQuality =
        !filters.quality || filters.quality === String(c.quality)
      const matchesSearch = getT(c.name)
        .toLowerCase()
        .includes(filters.search.toLowerCase())
      return matchesQuality && matchesSearch
    })

    result = result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return getT(a.name).localeCompare(getT(b.name))
        case 'quality':
          return b.quality - a.quality
        default:
          return a.id - b.id
      }
    })

    return result
  }, [cards, filters, translations, sortBy])

  const resetFilters = () => setFilters({ quality: '', search: '' })

  if (loading) {
    return (
      <div className="panel text-center py-8">
        <p className="text-sm text-[var(--text-muted)]">
          Loading Force Card data...
        </p>
      </div>
    )
  }

  return (
    <div className="panel animate-fadeIn">
      <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">
        Ultimate Power Cards
      </h2>

      {/* 🔹 Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        {/* Quality */}
        <div className="flex flex-col text-sm min-w-[140px]">
          <label className="mb-1 text-[var(--text-muted)] font-medium">
            Quality
          </label>
          <select
            value={filters.quality}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                quality: e.target.value,
              }))
            }
            className="border p-1 rounded bg-[var(--panel)] border-[var(--panel-border)] focus:ring-1 focus:ring-[var(--panel-border)]"
          >
            <option value="">All</option>
            {[2, 3, 4, 5].map((q) => (
              <option key={q} value={q}>
                {getT(`LC_COMMON_force_card_quality_quality_name_${q}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Sorting */}
        <div className="flex flex-col text-sm min-w-[140px]">
          <label className="mb-1 text-[var(--text-muted)] font-medium">
            Sort by
          </label>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'id' | 'name' | 'quality')
            }
            className="border p-1 rounded bg-[var(--panel)] border-[var(--panel-border)] focus:ring-1 focus:ring-[var(--panel-border)]"
          >
            <option value="id">ID</option>
            <option value="name">Name</option>
            <option value="quality">Quality</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex flex-col text-sm">
          <label className="mb-1 text-[var(--text-muted)] font-medium">
            Search by name
          </label>
          <input
            type="text"
            placeholder="Card name..."
            className="border p-1 rounded bg-[var(--panel)] border-[var(--panel-border)] focus:ring-1 focus:ring-[var(--panel-border)]"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                search: e.target.value,
              }))
            }
          />
        </div>

        <button
          onClick={resetFilters}
          className="px-3 py-1 rounded text-sm border border-[var(--panel-border)] bg-[var(--panel)] hover:bg-[var(--panel-hover)] transition"
        >
          Reset Filters
        </button>
      </div>

      {/* 🔹 Result */}
      <p className="text-sm text-[var(--text-muted)] mb-3">
        {processedCards.length} card
        {processedCards.length !== 1 && 's'} found
      </p>

      {/* 🔹 Grid */}
      {processedCards.length === 0 ? (
        <p className="text-center text-[var(--text-muted)] py-10">
          No cards match the current filters.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {processedCards.map((c) => {
            const icon = resolveIcon(c.id, c.icon_samll_path || c.icon_path)
            const qualityText = getT(
              `LC_COMMON_force_card_quality_quality_name_${c.quality}`
            )
            return (
              <Link
                key={c.id}
                href={`/force-cards/${c.id}`}
                className="shadow-md p-3 bg-[var(--panel)] hover:bg-[var(--panel-hover)] transition duration-200 text-center border border-[var(--panel-border)] rounded-md"
              >
                <img
                  src={icon}
                  alt={getT(c.name)}
                  className="mx-auto w-128 h-128 rounded-md mb-2"
                  onError={(e) => {
                    e.currentTarget.src =
                      '/assets/resources/textures/dynamis/card/ItemIcon_10000.png'
                  }} // fallback se falhar o carregamento
                />
                <p
                  className="font-semibold text-sm mb-1"
                  dangerouslySetInnerHTML={{
                    __html: getT(c.name),
                  }}
                />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
