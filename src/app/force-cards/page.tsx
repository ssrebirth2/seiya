'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import GameImage from '@/components/ui/GameImage'
import { resolveForceCardListIcon } from '@/lib/assets/game-images'
import { forceCardQualityNameKey } from '@/lib/i18n/ui-keys'

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

  const [filters, setFilters] = useState({
    quality: '',
    search: '',
  })
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'quality'>('id')

  const getT = useMemo(() => createTranslationGetter(translations), [translations])

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
        if (c.quality) keys.add(forceCardQualityNameKey(c.quality))
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
  }, [cards, filters, translations, sortBy, getT])

  const resetFilters = () => setFilters({ quality: '', search: '' })

  if (loading) {
    return (
      <div className="panel py-8 text-center">
        <p className="text-sm text-text-muted">{site('loadingForceCard')}</p>
      </div>
    )
  }

  return (
    <ListPagePanel>
      <h2 className="mb-4 text-xl font-bold uppercase tracking-wide">
        {t(UI_KEYS.list.forceCardGallery)}
      </h2>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex min-w-[140px] flex-col text-sm">
          <label className="field-label">{t(UI_KEYS.common.quality)}</label>
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
            <option value="">{t(UI_KEYS.filter.all)}</option>
            {[2, 3, 4, 5].map((q) => (
              <option key={q} value={q}>
                {getT(forceCardQualityNameKey(q))}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[140px] flex-col text-sm">
          <label className="field-label">{site('sortBy')}</label>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'id' | 'name' | 'quality')
            }
            className="control-input"
          >
            <option value="id">{site('id')}</option>
            <option value="name">{site('name')}</option>
            <option value="quality">{t(UI_KEYS.common.quality)}</option>
          </select>
        </div>

        <div className="flex flex-col text-sm">
          <label className="field-label">{site('searchByName')}</label>
          <input
            type="text"
            placeholder={site('searchPlaceholderCard')}
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
          {t(UI_KEYS.filter.clearAll)}
        </button>
      </div>

      <p className="mb-3 text-sm text-text-muted">
        {processedCards.length} {site('found')}
      </p>

      {processedCards.length === 0 ? (
        <p className="py-10 text-center text-text-muted">{site('noCardsMatch')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {processedCards.map((c) => {
            const hasIconPath = Boolean(c.icon_samll_path || c.icon_path)
            const { src: iconSrc, rawSrc: iconRaw } = resolveForceCardListIcon(c.id, hasIconPath)
            return (
              <Link
                key={c.id}
                href={`/force-cards/${c.id}`}
                className="catalog-card-link"
              >
                <GameImage
                  src={iconSrc}
                  rawSrc={iconRaw}
                  alt={getT(c.name)}
                  className="mx-auto mb-2 h-32 w-32 rounded-md bg-panel-hover object-contain"
                />
                <p
                  className="mb-1 text-sm font-semibold"
                  dangerouslySetInnerHTML={{
                    __html: getT(c.name),
                  }}
                />
              </Link>
            )
          })}
        </div>
      )}
    </ListPagePanel>
  )
}
