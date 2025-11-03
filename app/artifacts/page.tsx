'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { translateKeys } from '@/lib/translate'

interface Artifact {
  id: number
  name: string
  desc: string
  initial_quality: number
  isRare: boolean
}

export default function ArtifactListPage() {
  const { lang } = useLanguage()
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [resources, setResources] = useState<Record<number, any>>({})
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({
    quality: '',
    rarity: '',
    search: '',
  })

  const [sortBy, setSortBy] = useState<'id' | 'name' | 'quality'>('id')

  const getT = (key?: string) => translations[key || ''] || key || ''

  const resolveImagePath = (path: string): string =>
    `/assets/resources/textures/${path.replace(/Textures\//i, '').toLowerCase()}.png`

  useEffect(() => {
    const loadData = async () => {
      const [{ data: arts }, { data: res }] = await Promise.all([
        supabase
          .from('ArtifactConfig')
          .select('id, name, desc, initial_quality, isRare'),
        supabase.from('ArtifactResourcesConfig').select('id, preview_icon'),
      ])

      if (!arts) return

      const adjusted = arts.map((a) => ({
        ...a,
        initial_quality:
          typeof a.initial_quality === 'number'
            ? a.initial_quality - 1
            : a.initial_quality,
      }))

      const keys = new Set<string>()
      adjusted.forEach((a) => {
        if (a.name) keys.add(a.name)
        if (a.desc) keys.add(a.desc)
        if (a.initial_quality)
          keys.add(`LC_COMMON_quality_name_${a.initial_quality}`)
      })

      const [translated] = await Promise.all([
        translateKeys(Array.from(keys), lang),
      ])

      const resMap: Record<number, any> = {}
      res?.forEach((r) => (resMap[r.id] = r))

      setArtifacts(adjusted)
      setResources(resMap)
      setTranslations(translated)
      setLoading(false)
    }

    loadData()
  }, [lang])

  // 🔹 Filtering + Sorting
  const processedArtifacts = useMemo(() => {
    let result = artifacts.filter((a) => {
      const matchesQuality =
        !filters.quality || filters.quality === String(a.initial_quality)
      const matchesRarity =
        !filters.rarity ||
        (filters.rarity === 'rare' ? a.isRare : !a.isRare)
      const matchesSearch = getT(a.name)
        .toLowerCase()
        .includes(filters.search.toLowerCase())

      return matchesQuality && matchesRarity && matchesSearch
    })

    // Sorting
    result = result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return getT(a.name).localeCompare(getT(b.name))
        case 'quality':
          return b.initial_quality - a.initial_quality
        case 'id':
        default:
          return a.id - b.id
      }
    })

    return result
  }, [artifacts, filters, translations, sortBy])

  const resetFilters = () =>
    setFilters({ quality: '', rarity: '', search: '' })

  if (loading) {
    return (
      <div className="panel text-center py-8">
        <p className="text-sm text-[var(--text-muted)]">
          Loading artifact data...
        </p>
      </div>
    )
  }

  return (
    <div className="panel animate-fadeIn">
      {/* 🔹 Title */}
      <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">
        Artifact List
      </h2>

      {/* 🔹 Filter Bar */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        {/* Quality Filter */}
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
            {[2, 3, 4].map((q) => (
              <option key={q} value={q}>
                {getT(`LC_COMMON_quality_name_${q}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Option */}
        <div className="flex flex-col text-sm min-w-[140px]">
          <label className="mb-1 text-[var(--text-muted)] font-medium">
            Sort By
          </label>
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

        {/* Search Filter */}
        <div className="flex flex-col text-sm">
          <label className="mb-1 text-[var(--text-muted)] font-medium">
            Search by Name
          </label>
          <input
            type="text"
            placeholder="Artifact name..."
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
          Clear Filters
        </button>
      </div>

      {/* 🔹 Count */}
      <p className="text-sm text-[var(--text-muted)] mb-3">
        {processedArtifacts.length} artifact
        {processedArtifacts.length !== 1 && 's'} found
      </p>

      {/* 🔹 Grid */}
      {processedArtifacts.length === 0 ? (
        <p className="text-center text-[var(--text-muted)] py-10">
          No artifacts match your filters.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {processedArtifacts.map((art) => {
            const rawIconPath = resources[art.id]?.preview_icon
            const icon = rawIconPath ? resolveImagePath(rawIconPath) : null
            const qualityText = getT(
              `LC_COMMON_quality_name_${art.initial_quality}`
            )

            return (
              <Link
                key={art.id}
                href={`/artifacts/${art.id}`}
                className="shadow-md p-3 bg-[var(--panel)] hover:bg-[var(--panel-hover)] transition duration-200 text-center border border-[var(--panel-border)] rounded-md"
              >
                {icon && (
                  <img
                    src={icon}
                    alt={getT(art.name)}
                    className="mx-auto w-128 h-128 rounded-md mb-2"
                  />
                )}

                <p
                  className="font-semibold text-sm mb-1"
                  dangerouslySetInnerHTML={{
                    __html: getT(art.name),
                  }}
                />

                <p className="text-xs text-[var(--text-muted)] leading-snug mb-2">
                  {qualityText}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
