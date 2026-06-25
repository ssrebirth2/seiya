'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import {
  createTranslationGetter,
  preloadTranslations,
  translateKeys,
} from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { qualityNameKey } from '@/lib/i18n/ui-keys'
import {
  filterCatalogIndex,
  getItemQualityTiers,
  isItemCatalogListed,
  ITEM_BAG_TABS,
  ITEM_CATALOG_PAGE_SIZE,
  type ItemCatalogIndexRow,
  type ItemCatalogSortKey,
} from '@/lib/game/item-catalog'
import {
  collectItemLcKeys,
  resolveItemNameFromRow,
} from '@/lib/game/item-i18n'
import ItemCatalogGrid from '@/components/items/ItemCatalogGrid'
import { ItemFilterBar, type ItemListFilters } from '@/components/items/ItemFilterBar'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import { Button, EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/v2'

const toNum = (v: unknown, fallback = 0) => {
  if (v === null || v === undefined) return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

async function loadItemCatalogIndex(): Promise<ItemCatalogIndexRow[]> {
  const rows: ItemCatalogIndexRow[] = []
  let lastId = 0
  let guard = 0

  while (true) {
    guard++
    if (guard > 100) break

    const { data, error } = await supabase
      .from('ItemConfig')
      .select('id,name,type,quality,icon_path,sort_weight,des_value')
      .gt('id', lastId)
      .order('id', { ascending: true })
      .limit(1000)

    if (error) break
    const batch = (data ?? []) as Record<string, unknown>[]
    if (!batch.length) break

    for (const r of batch) {
      const row: ItemCatalogIndexRow = {
        id: toNum(r.id),
        name: String(r.name ?? ''),
        type: toNum(r.type, 0),
        quality: toNum(r.quality, 0),
        icon_path: (r.icon_path as string | null) ?? null,
        sort_weight: toNum(r.sort_weight, 0),
        des_value: r.des_value ?? null,
      }
      if (isItemCatalogListed(row)) rows.push(row)
    }

    const newLastId = toNum(batch[batch.length - 1]?.id, lastId)
    if (newLastId <= lastId) break
    lastId = newLastId
    if (batch.length < 1000) break
  }

  return rows
}

function collectFilterTranslationKeys(qualityTiers: number[]): string[] {
  const keys = new Set<string>()
  for (const tab of ITEM_BAG_TABS) keys.add(tab.nameKey)
  for (const q of qualityTiers) keys.add(qualityNameKey(q))
  return [...keys]
}

/** Stable empty map — avoids re-filtering catalog when sort does not use translated names. */
const EMPTY_TRANSLATIONS: Record<string, string> = {}

function translationSignature(lang: string, rows: ItemCatalogIndexRow[]): string {
  const keys = collectItemLcKeys(rows)
  keys.sort()
  return `${lang}\0${keys.join('\0')}`
}

export default function ItemsClient() {
  const { lang } = useLanguage()
  const { t, site } = useUiTranslation()

  const [catalog, setCatalog] = useState<ItemCatalogIndexRow[]>([])
  const [catalogReady, setCatalogReady] = useState(false)
  const [filterTranslations, setFilterTranslations] = useState<Record<string, string>>({})
  const [pageTranslations, setPageTranslations] = useState<Record<string, string>>({})
  const [pageReady, setPageReady] = useState(false)
  const [searchReady, setSearchReady] = useState(true)
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState<ItemListFilters>({
    tab: '0',
    quality: '',
    search: '',
  })
  const [sortBy, setSortBy] = useState<ItemCatalogSortKey>('id')
  const [page, setPage] = useState(1)

  const qualityTiers = useMemo(() => getItemQualityTiers(catalog), [catalog])

  const getFilterT = useMemo(
    () => createTranslationGetter(filterTranslations, { lang }),
    [filterTranslations, lang]
  )

  const mergedTranslations = useMemo(
    () => ({ ...filterTranslations, ...pageTranslations }),
    [filterTranslations, pageTranslations]
  )

  const translationsForSort = sortBy === 'name' ? mergedTranslations : EMPTY_TRANSLATIONS
  const translationsForSearch = filters.search.trim() ? mergedTranslations : EMPTY_TRANSLATIONS

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      try {
        const index = await loadItemCatalogIndex()
        if (!cancelled) {
          setCatalog(index)
          setCatalogReady(true)
        }
      } catch (error) {
        console.error('Failed to load item catalog:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!catalogReady) return
    let cancelled = false

    translateKeys(collectFilterTranslationKeys(qualityTiers), lang).then((map) => {
      if (!cancelled) setFilterTranslations(map)
    })

    return () => {
      cancelled = true
    }
  }, [lang, catalogReady, qualityTiers])

  const getItemName = useCallback(
    (row: ItemCatalogIndexRow) => resolveItemNameFromRow(row, mergedTranslations),
    [mergedTranslations]
  )

  const nameOfForCatalog = useCallback(
    (row: ItemCatalogIndexRow) => resolveItemNameFromRow(row, translationsForSort),
    [translationsForSort]
  )

  const nameOfForSearch = useCallback(
    (row: ItemCatalogIndexRow) => resolveItemNameFromRow(row, translationsForSearch),
    [translationsForSearch]
  )

  const filtered = useMemo(() => {
    if (!catalogReady) return []
    return filterCatalogIndex(catalog, {
      tab: filters.tab,
      quality: filters.quality,
      search: '',
      sortBy,
      nameOf: nameOfForCatalog,
    })
  }, [catalog, catalogReady, filters.tab, filters.quality, sortBy, nameOfForCatalog])

  const searchFiltered = useMemo(() => {
    if (!catalogReady) return []
    const search = filters.search.trim()
    if (!search) return filtered
    return filterCatalogIndex(catalog, {
      tab: filters.tab,
      quality: filters.quality,
      search,
      sortBy,
      nameOf: nameOfForSearch,
    })
  }, [catalog, catalogReady, filtered, filters.search, filters.tab, filters.quality, sortBy, nameOfForSearch])

  const visibleItems = useMemo(
    () => searchFiltered.slice(0, page * ITEM_CATALOG_PAGE_SIZE),
    [searchFiltered, page]
  )

  const visibleTranslationSig = useMemo(
    () => translationSignature(lang, visibleItems),
    [lang, visibleItems]
  )

  const visibleItemsRef = useRef(visibleItems)
  visibleItemsRef.current = visibleItems

  const hasMore = visibleItems.length < searchFiltered.length

  useEffect(() => {
    setPage(1)
  }, [filters.tab, filters.quality, filters.search, sortBy])

  useEffect(() => {
    if (!catalogReady) return
    let cancelled = false

    const search = filters.search.trim()
    if (!search) {
      setSearchReady(true)
      return () => {
        cancelled = true
      }
    }

    setSearchReady(false)
    const timer = window.setTimeout(async () => {
      const candidates = filterCatalogIndex(catalog, {
        tab: filters.tab,
        quality: filters.quality,
        search: '',
        sortBy,
        nameOf: (row) => row.name,
      })
      const keys = collectItemLcKeys(candidates)
      if (keys.length) await preloadTranslations(lang, keys)
      if (!cancelled) setSearchReady(true)
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [catalog, catalogReady, filters.search, filters.tab, filters.quality, sortBy, lang])

  useEffect(() => {
    setPageTranslations({})
    setPageReady(false)
  }, [lang])

  useEffect(() => {
    if (!catalogReady || !searchReady) return
    let cancelled = false

    const run = async () => {
      const keys = collectItemLcKeys(visibleItemsRef.current)
      if (!keys.length) {
        if (!cancelled) setPageReady(true)
        return
      }

      const map = await translateKeys(keys, lang)
      if (!cancelled) {
        setPageTranslations((prev) => ({ ...prev, ...map }))
        setPageReady(true)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [catalogReady, lang, searchReady, visibleTranslationSig])

  const handleFilterChange = useCallback((field: keyof ItemListFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({ tab: '0', quality: '', search: '' })
    setSortBy('id')
  }, [])

  if (loading) {
    return (
      <ListPagePanel>
        <LoadingSkeleton variant="filters" />
        <LoadingSkeleton variant="grid" count={12} />
      </ListPagePanel>
    )
  }

  const showGrid = pageReady && searchReady && visibleItems.length > 0
  const showEmpty = pageReady && searchReady && searchFiltered.length === 0

  return (
    <ListPagePanel>
      <PageHeader title={t(UI_KEYS.item.gallery)} />

      <ItemFilterBar
        filters={filters}
        sortBy={sortBy}
        qualityTiers={qualityTiers}
        onFilterChange={handleFilterChange}
        onSortChange={setSortBy}
        onClear={resetFilters}
        getT={getFilterT}
        resultCount={searchFiltered.length}
      />

      {!pageReady || !searchReady ? (
        <LoadingSkeleton variant="grid" count={12} />
      ) : showEmpty ? (
        <EmptyState message={t(UI_KEYS.item.notFound)} />
      ) : showGrid ? (
        <>
          <ItemCatalogGrid items={visibleItems} getItemName={getItemName} />
          {hasMore ? (
            <div className="mt-6 flex justify-center">
              <Button type="button" variant="secondary" onClick={() => setPage((p) => p + 1)}>
                {site('loadMore')}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </ListPagePanel>
  )
}
