'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import GameImage from '@/components/ui/GameImage'
import { resolveForceCardListIcon } from '@/lib/assets/game-images'
import { forceCardQualityNameKey } from '@/lib/i18n/ui-keys'
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
  const { t, site } = useUiTranslation()
  const [cards, setCards] = useState<ForceCard[]>([])
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
      const { data, error } = await supabase
        .from('ForceCardItemConfig')
        .select('id,name,desc,icon_path,icon_samll_path,quality,star,type,child_type,sort_weight')
        .order('sort_weight', { ascending: false })

      if (cancelled || !data || error) return

      const adjusted = data.map((c: ForceCard) => ({
        ...c,
        quality: typeof c.quality === 'number' ? c.quality : Number(c.quality) || 0,
      }))

      const keys = new Set<string>()
      adjusted.forEach((c) => {
        if (c.name) keys.add(c.name)
        if (c.desc) keys.add(c.desc)
        if (c.quality) keys.add(forceCardQualityNameKey(c.quality))
      })

      setCards(adjusted)
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
  }, [cards, filters, translations, sortBy, getT])

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
      <PageHeader title={t(UI_KEYS.list.forceCardGallery)} />

      <CatalogFilterBar
        onClear={resetFilters}
        resultCount={processedCards.length}
        resultLabel={site('found')}
        searchSlot={
          <Input
            type="text"
            placeholder={site('searchPlaceholderCard')}
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
              {getT(forceCardQualityNameKey(q))}
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

      {processedCards.length === 0 ? (
        <EmptyState message={site('noCardsMatch')} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {processedCards.map((c) => {
            const hasIconPath = Boolean(c.icon_samll_path || c.icon_path)
            const { src: iconSrc, rawSrc: iconRaw } = resolveForceCardListIcon(c.id, hasIconPath)
            return (
              <CatalogCard
                key={c.id}
                href={`/force-cards/${c.id}`}
                badge={<QualityBadge quality={c.quality} />}
                image={
                  <GameImage
                    src={iconSrc}
                    rawSrc={iconRaw}
                    alt={getT(c.name)}
                    className="mx-auto h-32 w-32 rounded-lg bg-panel-hover object-contain"
                    loading="lazy"
                  />
                }
                title={
                  <p
                    className="text-sm font-semibold"
                    dangerouslySetInnerHTML={{ __html: getT(c.name) }}
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
