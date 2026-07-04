'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-context'
import {
  createTranslationGetter,
  translateKeys,
} from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { qualityNameKey } from '@/lib/i18n/ui-keys'
import {
  filterCatalogIndex,
  getItemChildTypes,
  getItemQualityTiers,
  ITEM_BAG_TABS,
  ITEM_CATALOG_PAGE_SIZE,
  type ItemCatalogIndexRow,
  type ItemCatalogSortKey,
} from '@/lib/game/item-catalog'
import { collectItemLcKeys, resolveItemNameFromRow } from '@/lib/game/item-i18n'
import ItemCatalogGrid from '@/components/items/ItemCatalogGrid'
import { ItemFilterBar, type ItemListFilters } from '@/components/items/ItemFilterBar'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import { Button, EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/v2'
import { fetchItemCatalogIndex } from '@/lib/query/fetchers/item-catalog'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'
import { queryKeys } from '@/lib/query/query-keys'

function collectFilterTranslationKeys(qualityTiers: number[]): string[] {
  const keys = new Set<string>()
  for (const tab of ITEM_BAG_TABS) keys.add(tab.nameKey)
  for (const q of qualityTiers) keys.add(qualityNameKey(q))
  return [...keys]
}

export default function ItemsClient() {
  const { lang } = useLanguage()
  const { t, site } = useUiTranslation()

  const [filters, setFilters] = useState<ItemListFilters>({
    tab: '0',
    quality: '',
    childType: '',
    search: '',
  })
  const [sortBy, setSortBy] = useState<ItemCatalogSortKey>('id')
  const [page, setPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [translations, setTranslations] = useState<Record<string, string>>({})

  const { data: catalog = [], isLoading: catalogLoading } = useQuery({
    queryKey: queryKeys.itemCatalog,
    queryFn: fetchItemCatalogIndex,
    staleTime: GAME_CONFIG_STALE_MS,
  })

  const qualityTiers = useMemo(() => getItemQualityTiers(catalog), [catalog])
  const childTypes = useMemo(() => getItemChildTypes(catalog), [catalog])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [filters.search])

  useEffect(() => {
    setPage(1)
  }, [filters.tab, filters.quality, filters.childType, debouncedSearch, sortBy])

  const translationKeys = useMemo(() => {
    const keys = new Set(collectFilterTranslationKeys(qualityTiers))
    for (const row of catalog) {
      for (const k of collectItemLcKeys([row])) keys.add(k)
    }
    return [...keys]
  }, [catalog, qualityTiers])

  useEffect(() => {
    if (!translationKeys.length) return
    let cancelled = false
    translateKeys(translationKeys, lang).then((map) => {
      if (!cancelled) setTranslations(map)
    })
    return () => {
      cancelled = true
    }
  }, [lang, translationKeys])

  const getT = useMemo(
    () => createTranslationGetter(translations, { lang }),
    [translations, lang]
  )

  const getItemName = useCallback(
    (row: ItemCatalogIndexRow) => resolveItemNameFromRow(row, translations),
    [translations]
  )

  const searchFiltered = useMemo(() => {
    if (!catalog.length) return []
    return filterCatalogIndex(catalog, {
      tab: filters.tab,
      quality: filters.quality,
      childType: filters.childType,
      search: debouncedSearch,
      sortBy,
      nameOf: getItemName,
    })
  }, [catalog, filters.tab, filters.quality, filters.childType, debouncedSearch, sortBy, getItemName])

  const visibleItems = useMemo(
    () => searchFiltered.slice(0, page * ITEM_CATALOG_PAGE_SIZE),
    [searchFiltered, page]
  )

  const hasMore = visibleItems.length < searchFiltered.length
  const translationsReady = catalog.length === 0 || translationKeys.every((k) => k in translations)

  const handleFilterChange = useCallback((field: keyof ItemListFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({ tab: '0', quality: '', childType: '', search: '' })
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
      <PageHeader title={t(UI_KEYS.item.gallery)} />

      <ItemFilterBar
        filters={filters}
        sortBy={sortBy}
        qualityTiers={qualityTiers}
        childTypes={childTypes}
        onFilterChange={handleFilterChange}
        onSortChange={setSortBy}
        onClear={resetFilters}
        getT={getT}
        resultCount={searchFiltered.length}
      />

      {!translationsReady ? (
        <LoadingSkeleton variant="grid" count={12} />
      ) : searchFiltered.length === 0 ? (
        <EmptyState message={t(UI_KEYS.item.notFound)} />
      ) : (
        <>
          <ItemCatalogGrid items={visibleItems} getItemName={getItemName} lang={lang} />
          {hasMore ? (
            <div className="mt-6 flex justify-center">
              <Button type="button" variant="secondary" onClick={() => setPage((p) => p + 1)}>
                {site('loadMore')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </ListPagePanel>
  )
}
