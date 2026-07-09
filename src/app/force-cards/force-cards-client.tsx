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
  buildForceCardEffectSearchIndex,
  normalizeSearchText,
} from '@/lib/game/force-card-effect-search'
import {
  buildForceCardRestrictionChipMap,
  buildForceCardRestrictionChips,
  cardMatchesRestrictionFilter,
  collectRestrictionTranslationKeys,
  getForceCardQualityTiers,
  getForceCardRestrictionFilterChips,
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
  const [infoById, setInfoById] = useState<
    Record<number, { condition?: unknown; card_star?: unknown; card_awaken?: unknown }>
  >({})
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [effectSearchByCardId, setEffectSearchByCardId] = useState<Map<number, string>>(new Map())
  const [effectSearchReady, setEffectSearchReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [catalogReady, setCatalogReady] = useState(false)
  const [translationKeys, setTranslationKeys] = useState<string[]>([])

  const [filters, setFilters] = useState({ quality: '', search: '', searchDesc: '', restriction: '' })
  const [sortBy, setSortBy] = useState<ForceCardSortKey>('id')

  const getT = useMemo(() => createTranslationGetter(translations, { lang }), [translations, lang])

  const qualityTiers = useMemo(() => getForceCardQualityTiers(cards), [cards])

  const conditionRows = useMemo(
    () =>
      Object.entries(infoById).map(([id, row]) => ({
        id: Number(id),
        condition: row.condition,
      })),
    [infoById]
  )

  const restrictionChipMap = useMemo(
    () => buildForceCardRestrictionChipMap(conditionRows, lang),
    [conditionRows, lang]
  )

  const restrictionFilterChips = useMemo(
    () => getForceCardRestrictionFilterChips(conditionRows, lang),
    [conditionRows, lang]
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
        supabase.from('ForceCardInfoConfig').select('id,condition,card_star,card_awaken'),
      ])

      if (cancelled || !data || error) return

      const adjusted = data
        .filter((c: ForceCard) => isForceCardListed(c.id))
        .map((c: ForceCard) => ({
          ...c,
          quality: typeof c.quality === 'number' ? c.quality : Number(c.quality) || 0,
          sort_weight: typeof c.sort_weight === 'number' ? c.sort_weight : Number(c.sort_weight) || 0,
        }))

      const infoMap: Record<number, { condition?: unknown; card_star?: unknown; card_awaken?: unknown }> = {}
      ;(infoRows || []).forEach((row: { id: number; condition?: unknown; card_star?: unknown; card_awaken?: unknown }) => {
        infoMap[row.id] = {
          condition: row.condition,
          card_star: row.card_star,
          card_awaken: row.card_awaken,
        }
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
    if (!catalogReady || !cards.length) return
    let cancelled = false

    const infoRows = cards
      .map((card) => {
        const info = infoById[card.id]
        if (!info) return null
        return { id: card.id, card_star: info.card_star, card_awaken: info.card_awaken }
      })
      .filter((row): row is { id: number; card_star: unknown; card_awaken: unknown } => row != null)

    Promise.all([
      translationKeys.length ? translateKeys(translationKeys, lang) : Promise.resolve({}),
      buildForceCardEffectSearchIndex(cards, infoRows, lang),
    ]).then(([translated, effectIndex]) => {
      if (!cancelled) {
        setTranslations(translated)
        setEffectSearchByCardId(effectIndex)
        setEffectSearchReady(true)
      }
    })

    setEffectSearchReady(false)

    return () => {
      cancelled = true
    }
  }, [lang, catalogReady, cards, infoById, translationKeys])

  const processedCards = useMemo(() => {
    let result = cards.filter((c) => {
      const matchesQuality = !filters.quality || filters.quality === String(c.quality)
      const searchName = normalizeSearchText(filters.search)
      const searchDesc = normalizeSearchText(filters.searchDesc)
      const matchesSearch =
        !searchName || normalizeSearchText(getT(c.name)).includes(searchName)
      const effectText = effectSearchByCardId.get(c.id) ?? ''
      const matchesDesc =
        !searchDesc ||
        !effectSearchReady ||
        normalizeSearchText(effectText).includes(searchDesc)
      const matchesRestriction = cardMatchesRestrictionFilter(
        c.id,
        filters.restriction,
        restrictionChipMap
      )
      return matchesQuality && matchesSearch && matchesDesc && matchesRestriction
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
  }, [cards, filters, restrictionChipMap, translations, effectSearchByCardId, effectSearchReady, sortBy, getT])

  const resetFilters = () => setFilters({ quality: '', search: '', searchDesc: '', restriction: '' })

  const handleFilterChange = (field: 'quality' | 'search' | 'searchDesc' | 'restriction', value: string) => {
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
        restrictionChips={restrictionFilterChips}
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
