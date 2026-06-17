'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import ArtifactPreviewImage from '@/components/ui/ArtifactPreviewImage'
import { qualityNameKey } from '@/lib/i18n/ui-keys'
import {
  CatalogCard,
  CatalogFilterBar,
  EmptyState,
  Input,
  LoadingSkeleton,
  PageHeader,
  QualityBadge,
  Select,
} from '@/components/ui/v2'

interface Artifact {
  id: number
  name: string
  desc: string
  initial_quality: number
  isRare: boolean
}

export default function ArtifactsClient() {
  const { lang } = useLanguage()
  const { t, site } = useUiTranslation()
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [resources, setResources] = useState<Record<number, any>>({})
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [catalogReady, setCatalogReady] = useState(false)
  const [translationKeys, setTranslationKeys] = useState<string[]>([])

  const [filters, setFilters] = useState({
    quality: '',
    rarity: '',
    search: '',
  })

  const [sortBy, setSortBy] = useState<'id' | 'name' | 'quality'>('id')

  const getT = useMemo(() => createTranslationGetter(translations, { lang }), [translations, lang])

  useEffect(() => {
    let cancelled = false

    const loadCatalog = async () => {
      setLoading(true)
      const [{ data: arts }, { data: res }] = await Promise.all([
        supabase.from('ArtifactConfig').select('id, name, desc, initial_quality, isRare'),
        supabase.from('ArtifactResourcesConfig').select('id, preview_icon'),
      ])

      if (cancelled || !arts) return

      const adjusted = arts.map((a) => ({
        ...a,
        initial_quality:
          typeof a.initial_quality === 'number' ? a.initial_quality - 1 : a.initial_quality,
      }))

      const keys = new Set<string>()
      adjusted.forEach((a) => {
        if (a.name) keys.add(a.name)
        if (a.desc) keys.add(a.desc)
        if (a.initial_quality) keys.add(qualityNameKey(a.initial_quality))
      })

      const resMap: Record<number, any> = {}
      res?.forEach((r) => (resMap[r.id] = r))

      setArtifacts(adjusted)
      setResources(resMap)
      setTranslationKeys(Array.from(keys))
      setCatalogReady(true)
      setLoading(false)
    }

    loadCatalog()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!catalogReady || !translationKeys.length) return
    let cancelled = false

    translateKeys(translationKeys, lang).then((translated) => {
      if (!cancelled) setTranslations(translated)
    })

    return () => {
      cancelled = true
    }
  }, [lang, catalogReady, translationKeys])

  const processedArtifacts = useMemo(() => {
    let result = artifacts.filter((a) => {
      const matchesQuality = !filters.quality || filters.quality === String(a.initial_quality)
      const matchesRarity =
        !filters.rarity || (filters.rarity === 'rare' ? a.isRare : !a.isRare)
      const matchesSearch = getT(a.name).toLowerCase().includes(filters.search.toLowerCase())
      return matchesQuality && matchesRarity && matchesSearch
    })

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
  }, [artifacts, filters, translations, sortBy, getT])

  const resetFilters = () => setFilters({ quality: '', rarity: '', search: '' })

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
      <PageHeader title={t(UI_KEYS.list.artifactGallery)} />

      <CatalogFilterBar
        onClear={resetFilters}
        resultCount={processedArtifacts.length}
        resultLabel={site('found')}
        searchSlot={
          <Input
            type="text"
            placeholder={site('searchPlaceholderArtifact')}
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            aria-label={site('searchByName')}
          />
        }
      >
        <Select
          label={t(UI_KEYS.common.quality)}
          value={filters.quality}
          onChange={(e) => setFilters((prev) => ({ ...prev, quality: e.target.value }))}
        >
          <option value="">{t(UI_KEYS.filter.all)}</option>
          {[2, 3, 4].map((q) => (
            <option key={q} value={q}>
              {getT(qualityNameKey(q))}
            </option>
          ))}
        </Select>
        <Select
          label={site('sortBy')}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'id' | 'name' | 'quality')}
        >
          <option value="id">{site('id')}</option>
          <option value="name">{site('name')}</option>
          <option value="quality">{t(UI_KEYS.common.quality)}</option>
        </Select>
      </CatalogFilterBar>

      {processedArtifacts.length === 0 ? (
        <EmptyState message={site('noArtifactsMatch')} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {processedArtifacts.map((art) => {
            const rawIconPath = resources[art.id]?.preview_icon as string | undefined
            return (
              <CatalogCard
                key={art.id}
                href={`/artifacts/${art.id}`}
                badge={<QualityBadge quality={art.initial_quality} />}
                image={
                  <ArtifactPreviewImage
                    artifactId={art.id}
                    dbPreviewPath={rawIconPath}
                    alt={getT(art.name)}
                    className="mx-auto h-32 w-32 rounded-lg bg-panel-hover object-contain"
                  />
                }
                title={
                  <p
                    className="text-sm font-semibold"
                    dangerouslySetInnerHTML={{ __html: getT(art.name) }}
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
