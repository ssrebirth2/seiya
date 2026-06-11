'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys } from '@/lib/i18n/language-package'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import ArtifactPreviewImage from '@/components/ui/ArtifactPreviewImage'

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

      const translated = await translateKeys(Array.from(keys), lang)

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
        <p className="text-sm text-text-muted">Loading artifact data...</p>
      </div>
    )
  }

  return (
    <ListPagePanel>
      <h2 className="mb-4 text-xl font-bold uppercase tracking-wide">Artifact List</h2>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        {/* Quality Filter */}
        <div className="flex min-w-[140px] flex-col text-sm">
          <label className="field-label">Quality</label>
          <select
            value={filters.quality}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                quality: e.target.value,
              }))
            }
            className="control-input"
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

        {/* Search Filter */}
        <div className="flex flex-col text-sm">
          <label className="field-label">Search by Name</label>
          <input
            type="text"
            placeholder="Artifact name..."
            className="control-input"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                search: e.target.value,
              }))
            }
          />
        </div>

        <button type="button" onClick={resetFilters} className="btn-secondary">
          Clear Filters
        </button>
      </div>

      {/* 🔹 Count */}
      <p className="mb-3 text-sm text-text-muted">
        {processedArtifacts.length} artifact
        {processedArtifacts.length !== 1 && 's'} found
      </p>

      {processedArtifacts.length === 0 ? (
        <p className="py-10 text-center text-text-muted">
          No artifacts match your filters.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {processedArtifacts.map((art) => {
            const rawIconPath = resources[art.id]?.preview_icon as string | undefined
            const qualityText = getT(
              `LC_COMMON_quality_name_${art.initial_quality}`
            )

            return (
              <Link
                key={art.id}
                href={`/artifacts/${art.id}`}
                className="catalog-card-link"
              >
                <ArtifactPreviewImage
                  artifactId={art.id}
                  dbPreviewPath={rawIconPath}
                  alt={getT(art.name)}
                  className="mx-auto mb-2 h-32 w-32 rounded-md object-contain bg-panel-hover"
                />

                <p
                  className="font-semibold text-sm mb-1"
                  dangerouslySetInnerHTML={{
                    __html: getT(art.name),
                  }}
                />

                <p className="mb-2 text-xs leading-snug text-text-muted">
                  {qualityText}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </ListPagePanel>
  )
}
