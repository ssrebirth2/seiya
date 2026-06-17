'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import CompanionListIcon from '@/components/ui/CompanionListIcon'
import { isCompanionListed } from '@/lib/game/hidden-companion-ids'
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

interface Companion {
  id: number
  name: string
  desc: string | null
  init_quality: number
  skins: number
}

export default function CompanionsClient() {
  const { lang } = useLanguage()
  const { t, site } = useUiTranslation()
  const [companions, setCompanions] = useState<Companion[]>([])
  const [resources, setResources] = useState<Record<number, { item_icon?: string; preview_icon?: string }>>({})
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [catalogReady, setCatalogReady] = useState(false)
  const [translationKeys, setTranslationKeys] = useState<string[]>([])

  const [filters, setFilters] = useState({ quality: '', search: '' })
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'quality'>('id')

  const getT = useMemo(() => createTranslationGetter(translations, { lang }), [translations, lang])

  useEffect(() => {
    let cancelled = false

    const loadCatalog = async () => {
      setLoading(true)
      const { data: spirits } = await supabase
        .from('SpiritConfig')
        .select('id, name, desc, init_quality, skins')
        .order('id')

      if (cancelled) return
      if (!spirits) {
        setLoading(false)
        return
      }

      const listed = spirits.filter((s) => isCompanionListed(s.id) && s.name) as Companion[]
      const skinIds = [...new Set(listed.map((s) => s.skins).filter(Boolean))]

      const { data: res } =
        skinIds.length > 0
          ? await supabase
              .from('ArtifactResourcesConfig')
              .select('id, item_icon, preview_icon')
              .in('id', skinIds)
          : { data: [] as { id: number; item_icon?: string; preview_icon?: string }[] }

      if (cancelled) return

      const keys = new Set<string>()
      listed.forEach((c) => {
        if (c.name) keys.add(c.name)
        if (c.desc) keys.add(c.desc)
        if (c.init_quality) keys.add(qualityNameKey(c.init_quality))
      })

      const resMap: Record<number, { item_icon?: string; preview_icon?: string }> = {}
      res?.forEach((r) => {
        resMap[r.id] = r
      })

      setCompanions(listed)
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

  const processed = useMemo(() => {
    let result = companions.filter((c) => {
      const matchesQuality = !filters.quality || filters.quality === String(c.init_quality)
      const matchesSearch = getT(c.name).toLowerCase().includes(filters.search.toLowerCase())
      return matchesQuality && matchesSearch
    })

    result = result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return getT(a.name).localeCompare(getT(b.name))
        case 'quality':
          return b.init_quality - a.init_quality
        case 'id':
        default:
          return a.id - b.id
      }
    })

    return result
  }, [companions, filters, sortBy, translations, getT])

  const resetFilters = () => setFilters({ quality: '', search: '' })

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
      <PageHeader title={t(UI_KEYS.list.companionGallery)} />

      <CatalogFilterBar
        onClear={resetFilters}
        resultCount={processed.length}
        resultLabel={site('found')}
        searchSlot={
          <Input
            type="text"
            placeholder={site('searchPlaceholderCompanion')}
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
          {[2, 3, 4, 5].map((q) => (
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

      {processed.length === 0 ? (
        <EmptyState message={t(UI_KEYS.filter.emptyCompanions)} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {processed.map((companion) => {
            const res = resources[companion.skins]
            return (
              <CatalogCard
                key={companion.id}
                href={`/companions/${companion.id}`}
                badge={<QualityBadge quality={companion.init_quality} />}
                image={
                  <CompanionListIcon
                    dbItemIconPath={res?.item_icon}
                    alt={getT(companion.name)}
                    className="mx-auto h-24 w-24 rounded-lg bg-panel-hover object-contain p-1"
                  />
                }
                title={
                  <p
                    className="text-sm font-semibold"
                    dangerouslySetInnerHTML={{ __html: getT(companion.name) }}
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
