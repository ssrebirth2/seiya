'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import { ForceCardCatalogItem } from '@/components/force-cards/ForceCardCatalogItem'
import {
  ForceCardFilterBar,
  type ForceCardSortKey,
} from '@/components/force-cards/ForceCardFilterBar'
import { isForceCardListed } from '@/lib/game/hidden-force-card-ids'
import {
  buildCardRestrictionTypeMap,
  buildForceCardRestrictionChips,
  cardMatchesRestrictionFilter,
  collectRestrictionTranslationKeys,
  getForceCardQualityTiers,
} from '@/lib/game/force-card-equip'
import { forceCardQualityNameKey } from '@/lib/i18n/ui-keys'
import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
} from '@/components/ui/v2'

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

export default function ForceCardsClient() {
  const { lang } = useLanguage()
  const { t, site } = useUiTranslation()
  const [cards, setCards] = useState<ForceCard[]>([])
  const [infoById, setInfoById] = useState<Record<number, { condition?: unknown }>>({})
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [catalogReady, setCatalogReady] = useState(false)
  const [translationKeys, setTranslationKeys] = useState<string[]>([])

  const [filters, setFilters] = useState({ quality: '', search: '', restriction: '' })
  const [sortBy, setSortBy] = useState<ForceCardSortKey>('id')

  const getT = useMemo(() => createTranslationGetter(translations, { lang }), [translations, lang])

  const qualityTiers = useMemo(() => getForceCardQualityTiers(cards), [cards])

  const restrictionMap = useMemo(
    () =>
      buildCardRestrictionTypeMap(
        Object.entries(infoById).map(([id, row]) => ({
          id: Number(id),
          condition: row.condition,
        }))
      ),
    [infoById]
  )

  useEffect(() => {
    let cancelled = false

    const loadCatalog = async () => {
      setLoading(true)
      const [{ data, error }, { data: infoRows }] = await Promise.all([
        supabase
          .from('ForceCardItemConfig')
          .select('id,name,desc,icon_path,icon_samll_path,quality,star,type,child_type,sort_weight')
          .order('id', { ascending: true }),
        supabase.from('ForceCardInfoConfig').select('id,condition'),
      ])

      if (cancelled || !data || error) return

      const adjusted = data
        .filter((c: ForceCard) => isForceCardListed(c.id))
        .map((c: ForceCard) => ({
          ...c,
          quality: typeof c.quality === 'number' ? c.quality : Number(c.quality) || 0,
          sort_weight: typeof c.sort_weight === 'number' ? c.sort_weight : Number(c.sort_weight) || 0,
        }))

      const infoMap: Record<number, { condition?: unknown }> = {}
      ;(infoRows || []).forEach((row: { id: number; condition?: unknown }) => {
        infoMap[row.id] = { condition: row.condition }
      })

      const keys = new Set<string>()
      adjusted.forEach((c) => {
        if (c.name) keys.add(c.name)
        if (c.desc) keys.add(c.desc)
        if (c.quality) keys.add(forceCardQualityNameKey(c.quality))
      })
      Object.values(infoMap).forEach((row) => {
        collectRestrictionTranslationKeys(row.condition).forEach((key) => keys.add(key))
      })

      setCards(adjusted)
      setInfoById(infoMap)
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

  const processedCards = useMemo(() => {
    let result = cards.filter((c) => {
      const matchesQuality = !filters.quality || filters.quality === String(c.quality)
      const matchesSearch = getT(c.name).toLowerCase().includes(filters.search.toLowerCase())
      const matchesRestriction = cardMatchesRestrictionFilter(
        c.id,
        filters.restriction,
        restrictionMap
      )
      return matchesQuality && matchesSearch && matchesRestriction
    })

    result = result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return getT(a.name).localeCompare(getT(b.name)) || a.id - b.id
        case 'quality':
          return b.quality - a.quality || a.id - b.id
        case 'id':
        default:
          return a.id - b.id
      }
    })

    return result
  }, [cards, filters, restrictionMap, translations, sortBy, getT])

  const resetFilters = () => setFilters({ quality: '', search: '', restriction: '' })

  const handleFilterChange = (field: 'quality' | 'search' | 'restriction', value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <ListPagePanel>
        <LoadingSkeleton variant="filters" />
        <LoadingSkeleton variant="force-card-grid" />
      </ListPagePanel>
    )
  }

  return (
    <ListPagePanel>
      <PageHeader title={t(UI_KEYS.list.forceCardGallery)} />

      <ForceCardFilterBar
        filters={filters}
        sortBy={sortBy}
        qualityTiers={qualityTiers}
        restrictionMap={restrictionMap}
        onFilterChange={handleFilterChange}
        onSortChange={setSortBy}
        onClear={resetFilters}
        getT={getT}
        resultCount={processedCards.length}
      />

      {processedCards.length === 0 ? (
        <EmptyState message={site('noCardsMatch')} />
      ) : (
        <div className="force-card-catalog-grid">
          {processedCards.map((c) => (
            <ForceCardCatalogItem
              key={c.id}
              cardId={c.id}
              hasSmallIcon={Boolean(c.icon_samll_path || c.icon_path)}
              href={`/force-cards/${c.id}`}
              restrictionChips={buildForceCardRestrictionChips(infoById[c.id]?.condition, lang)}
              getT={getT}
              name={
                <span
                  dangerouslySetInnerHTML={{
                    __html: getT(c.name),
                  }}
                />
              }
            />
          ))}
        </div>
      )}
    </ListPagePanel>
  )
}
