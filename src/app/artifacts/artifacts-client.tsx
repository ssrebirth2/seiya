'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import { qualityNameKey } from '@/lib/i18n/ui-keys'
import {
  artifactDisplayQuality,
  artifactFrameQuality,
  artifactMatchesRestrictionFilter,
  buildArtifactRestrictionChipMap,
  buildArtifactRestrictionChips,
  collectArtifactRestrictionTranslationKeys,
  getArtifactRestrictionFilterChips,
} from '@/lib/game/artifact-equip'
import { ArtifactFilterBar, type ArtifactListFilters, type ArtifactSortKey } from '@/components/artifacts/ArtifactFilterBar'
import { ArtifactCatalogGrid } from '@/components/artifacts/ArtifactCatalogGrid'
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/v2'

interface Artifact {
  id: number
  name: string
  desc: string
  initial_quality: number
  frame_quality: number
  limit?: unknown
  item_icon?: string | null
  restrictionChips: ReturnType<typeof buildArtifactRestrictionChips>
}

function getQualityTiers(artifacts: Artifact[]): number[] {
  const tiers = new Set<number>()
  for (const art of artifacts) {
    if (art.initial_quality > 0) tiers.add(art.initial_quality)
  }
  return [...tiers].sort((a, b) => a - b)
}

export default function ArtifactsClient() {
  const { lang } = useLanguage()
  const { t, site } = useUiTranslation()
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogReady, setCatalogReady] = useState(false)
  const [translationKeys, setTranslationKeys] = useState<string[]>([])

  const [filters, setFilters] = useState<ArtifactListFilters>({
    quality: '',
    restriction: '',
    search: '',
  })

  const [sortBy, setSortBy] = useState<ArtifactSortKey>('id')

  const getT = useMemo(() => createTranslationGetter(translations, { lang }), [translations, lang])

  useEffect(() => {
    let cancelled = false

    const loadCatalog = async () => {
      setCatalogLoading(true)
      const [{ data: arts }, { data: res }] = await Promise.all([
        supabase.from('ArtifactConfig').select('id, name, desc, initial_quality, limit'),
        supabase.from('ArtifactResourcesConfig').select('id, item_icon'),
      ])

      if (cancelled || !arts) return

      const resMap = new Map<number, string | null | undefined>()
      res?.forEach((r) => resMap.set(r.id, r.item_icon))

      const adjusted = arts.map((a) => {
        const dbQuality = a.initial_quality
        return {
          ...a,
          initial_quality: artifactDisplayQuality(dbQuality),
          frame_quality: artifactFrameQuality(dbQuality),
          item_icon: resMap.get(a.id) ?? null,
          restrictionChips: buildArtifactRestrictionChips(a.limit, lang),
        }
      })

      const keys = new Set<string>()
      adjusted.forEach((a) => {
        if (a.name) keys.add(a.name)
        if (a.desc) keys.add(a.desc)
        if (a.initial_quality) keys.add(qualityNameKey(a.initial_quality))
        collectArtifactRestrictionTranslationKeys(a.limit).forEach((key) => keys.add(key))
      })

      setArtifacts(adjusted)
      setTranslationKeys(Array.from(keys))
      setCatalogReady(true)
      setCatalogLoading(false)
    }

    loadCatalog()
    return () => {
      cancelled = true
    }
  }, [lang])

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

  const qualityTiers = useMemo(() => getQualityTiers(artifacts), [artifacts])

  const restrictionChipMap = useMemo(
    () => buildArtifactRestrictionChipMap(artifacts, lang),
    [artifacts, lang]
  )

  const restrictionFilterChips = useMemo(
    () => getArtifactRestrictionFilterChips(artifacts, lang),
    [artifacts, lang]
  )

  const processedArtifacts = useMemo(() => {
    let result = artifacts.filter((a) => {
      const matchesQuality = !filters.quality || filters.quality === String(a.initial_quality)
      const matchesRestriction = artifactMatchesRestrictionFilter(
        a.id,
        filters.restriction,
        restrictionChipMap
      )
      const matchesSearch = getT(a.name).toLowerCase().includes(filters.search.toLowerCase())
      return matchesQuality && matchesRestriction && matchesSearch
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
  }, [artifacts, filters, sortBy, getT, restrictionChipMap])

  const translationsReady =
    artifacts.length === 0 || translationKeys.every((k) => k in translations)

  const getArtifactName = useCallback(
    (row: { name: string }) => getT(row.name),
    [getT]
  )

  const handleFilterChange = useCallback((field: keyof ArtifactListFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({ quality: '', restriction: '', search: '' })
    setSortBy('id')
  }, [])

  if (catalogLoading) {
    return (
      <ListPagePanel>
        <LoadingSkeleton variant="filters" />
        <LoadingSkeleton variant="grid" count={12} />
      </ListPagePanel>
    )
  }

  return (
    <ListPagePanel>
      <PageHeader title={t(UI_KEYS.list.artifactGallery)} />

      <ArtifactFilterBar
        filters={filters}
        sortBy={sortBy}
        qualityTiers={qualityTiers}
        restrictionChips={restrictionFilterChips}
        onFilterChange={handleFilterChange}
        onSortChange={setSortBy}
        onClear={resetFilters}
        getT={getT}
        resultCount={processedArtifacts.length}
      />

      {!translationsReady ? (
        <LoadingSkeleton variant="grid" count={12} />
      ) : processedArtifacts.length === 0 ? (
        <EmptyState message={site('noArtifactsMatch')} />
      ) : (
        <ArtifactCatalogGrid
          artifacts={processedArtifacts}
          getArtifactName={getArtifactName}
          getT={getT}
        />
      )}
    </ListPagePanel>
  )
}
