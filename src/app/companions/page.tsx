'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import CompanionListIcon from '@/components/ui/CompanionListIcon'
import { isCompanionListed } from '@/lib/game/hidden-companion-ids'
import { qualityNameKey } from '@/lib/i18n/ui-keys'

interface Companion {
  id: number
  name: string
  desc: string | null
  init_quality: number
  skins: number
}

export default function CompanionListPage() {
  const { lang } = useLanguage()
  const { t, site } = useUiTranslation()
  const [companions, setCompanions] = useState<Companion[]>([])
  const [resources, setResources] = useState<Record<number, { item_icon?: string; preview_icon?: string }>>({})
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
      const { data: spirits } = await supabase
        .from('SpiritConfig')
        .select('id, name, desc, init_quality, skins')
        .order('id')

      if (!spirits) {
        setLoading(false)
        return
      }

      const listed = spirits.filter(
        (s) => isCompanionListed(s.id) && s.name
      ) as Companion[]

      const skinIds = [...new Set(listed.map((s) => s.skins).filter(Boolean))]

      const { data: res } =
        skinIds.length > 0
          ? await supabase
              .from('ArtifactResourcesConfig')
              .select('id, item_icon, preview_icon')
              .in('id', skinIds)
          : { data: [] as { id: number; item_icon?: string; preview_icon?: string }[] }

      const keys = new Set<string>()
      listed.forEach((c) => {
        if (c.name) keys.add(c.name)
        if (c.desc) keys.add(c.desc)
        if (c.init_quality) keys.add(qualityNameKey(c.init_quality))
      })

      const translated = await translateKeys(Array.from(keys), lang)

      const resMap: Record<number, { item_icon?: string; preview_icon?: string }> = {}
      res?.forEach((r) => {
        resMap[r.id] = r
      })

      setCompanions(listed)
      setResources(resMap)
      setTranslations(translated)
      setLoading(false)
    }

    loadData()
  }, [lang])

  const processed = useMemo(() => {
    let result = companions.filter((c) => {
      const matchesQuality =
        !filters.quality || filters.quality === String(c.init_quality)
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
      <div className="panel py-8 text-center">
        <p className="text-sm text-text-muted">{site('loadingCompanion')}</p>
      </div>
    )
  }

  return (
    <ListPagePanel>
      <h2 className="mb-4 text-xl font-bold uppercase tracking-wide">
        {t(UI_KEYS.list.companionGallery)}
      </h2>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex min-w-[140px] flex-col text-sm">
          <label className="field-label">{t(UI_KEYS.common.quality)}</label>
          <select
            value={filters.quality}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, quality: e.target.value }))
            }
            className="control-input"
          >
            <option value="">{t(UI_KEYS.filter.all)}</option>
            {[2, 3, 4, 5].map((q) => (
              <option key={q} value={q}>
                {getT(qualityNameKey(q))}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[140px] flex-col text-sm">
          <label className="field-label">{site('sortBy')}</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'id' | 'name' | 'quality')}
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
            placeholder={site('searchPlaceholderCompanion')}
            className="control-input"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />
        </div>

        <button type="button" onClick={resetFilters} className="btn-secondary">
          {t(UI_KEYS.filter.clearAll)}
        </button>
      </div>

      <p className="mb-3 text-sm text-text-muted">
        {processed.length} {site('found')}
      </p>

      {processed.length === 0 ? (
        <p className="py-10 text-center text-text-muted">
          {t(UI_KEYS.filter.emptyCompanions)}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {processed.map((companion) => {
            const res = resources[companion.skins]
            const qualityText = getT(qualityNameKey(companion.init_quality))

            return (
              <Link
                key={companion.id}
                href={`/companions/${companion.id}`}
                className="catalog-card-link"
              >
                <CompanionListIcon
                  dbItemIconPath={res?.item_icon}
                  alt={getT(companion.name)}
                  className="mx-auto mb-2 h-24 w-24 rounded-md bg-panel-hover object-contain p-1"
                />

                <p
                  className="mb-1 text-sm font-semibold"
                  dangerouslySetInnerHTML={{ __html: getT(companion.name) }}
                />

                <p className="text-xs leading-snug text-text-muted">{qualityText}</p>
              </Link>
            )
          })}
        </div>
      )}
    </ListPagePanel>
  )
}
