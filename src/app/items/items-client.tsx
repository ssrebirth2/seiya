'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { preloadTranslations, useTranslation } from '@/lib/i18n/use-translation'
import ItemsTable from '@/components/items/ItemsTable'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import { CatalogFilterBar, Input, LoadingSkeleton, Select } from '@/components/ui/v2'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type ItemRow = {
  id: number
  name: string
  desc: string
  type: number | string | null
  child_type: number | string | null
  quality: number | string | null
  icon_path?: string | null
  max_num?: number | string | null
  isRare?: boolean | number | string | null
  sort_weight?: number | string | null
  compose?: number | string | null
}

type ItemTypeRow = {
  id: number
  itemType: number | string
  name?: string
  normal_tag_name?: string
  select_tag_name?: string
}

type UsedInCraft = { targetId: number; qty: number }
type UsedInIndex = Record<number, UsedInCraft[]>

const ITEM_BATCH_SIZE = 1000
const USED_IN_BATCH_SIZE = 1000

const UI_STATIC_KEYS = [
  'Item Database',
  'Category',
  'Quality',
  'Rarity',
  'Sort by',
  'Search',
  'Search item name...',
  'All',
  'Rare',
  'Normal',
  'ID',
  'Name',
  'Type',
  'Reset',
  'Loading initial data...',
  'Loading item database...',
  'items loaded so far',
  'Showing',
  'of',
  'items',
  'Building used-in index...',
] as const

const QUALITY_KEYS = Array.from({ length: 10 }, (_, i) => `LC_COMMON_quality_name_${i + 1}`)

const toNum = (v: unknown, fallback = 0) => {
  if (v === null || v === undefined) return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

const toBool = (v: unknown) => {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true'
  return false
}

const normalizeList = (v: unknown): any[] => {
  if (!v) return []
  if (Array.isArray(v)) return v
  if (typeof v !== 'string') return []
  try {
    const parsed = JSON.parse(v)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const pickSid = (x: any) => toNum(x?.sid, 0)
const pickQty = (x: any) => toNum(x?.num ?? x?.amount ?? x?.count ?? 0, 0)

const resolveTexturePath = (raw?: string | null): string | null => {
  if (!raw) return null
  const cleaned = raw.replace(/^Textures\//i, '').replace(/\.png$/i, '')
  return `/assets/resources/textures/${cleaned.toLowerCase()}.png`
}

async function buildUsedInIndex(): Promise<UsedInIndex> {
  const index: UsedInIndex = {}
  let from = 0

  console.log('Building used-in index...')

  while (true) {
    const to = from + USED_IN_BATCH_SIZE - 1
    const { data, error } = await supabase
      .from('CompositeConfig')
      .select('id,consume')
      .order('id', { ascending: true })
      .range(from, to)

    if (error) {
      console.error('Error building used-in index:', error)
      break
    }

    const rows = (data ?? []) as any[]
    if (!rows.length) break

    for (const r of rows) {
      const targetId = toNum(r.id)
      const consume = normalizeList(r.consume)

      for (const ing of consume) {
        const sid = pickSid(ing)
        if (!sid) continue
        const qty = pickQty(ing)

        if (!index[sid]) index[sid] = []
        index[sid].push({ targetId, qty })
      }
    }

    if (rows.length < USED_IN_BATCH_SIZE) break
    from += USED_IN_BATCH_SIZE
  }

  console.log('Used-in index built with', Object.keys(index).length, 'items')
  return index
}

async function loadAllItemsBuffer(): Promise<ItemRow[]> {
  const allItems: ItemRow[] = []

  // limite seguro por request (compatível com teto do Supabase/PostgREST)
  const BATCH = 1000

  let lastId = 0
  let guard = 0

  console.log('Loading all items buffer (cursor pagination)...')

  while (true) {
    // "guard" evita loop infinito se algo muito errado acontecer
    guard++
    if (guard > 10000) {
      console.warn('Guard stop: too many iterations. Check pagination / RLS / ordering.')
      break
    }

    const { data, error } = await supabase
      .from('ItemConfig')
      .select('id,name,desc,type,child_type,quality,icon_path,max_num,isRare,sort_weight,compose')
      .gt('id', lastId)
      .order('id', { ascending: true })
      .limit(BATCH)

    if (error) {
      console.error('Error loading items buffer:', error)
      break
    }

    const rows = (data ?? []) as any[]
    if (!rows.length) break

    for (const r of rows) {
      allItems.push({
        id: toNum(r.id),
        name: r.name,
        desc: r.desc,
        type: r.type ?? null,
        child_type: r.child_type ?? null,
        quality: toNum(r.quality, 0),
        icon_path: r.icon_path ?? null,
        max_num: r.max_num ?? null,
        isRare: toBool(r.isRare),
        sort_weight: toNum(r.sort_weight, 0),
        compose: r.compose ?? null,
      })
    }

    const newLastId = toNum(rows[rows.length - 1]?.id, lastId)

    console.log(
      `Loaded ${allItems.length} items... (batch=${rows.length}, lastId=${newLastId})`
    )

    // se não avançou, para (evita repetir o mesmo batch)
    if (newLastId <= lastId) {
      console.warn('Pagination did not advance. lastId=', lastId, 'newLastId=', newLastId)
      break
    }

    lastId = newLastId

    // fim natural
    if (rows.length < BATCH) break
  }

  console.log(`Total items loaded: ${allItems.length}`)
  return allItems
}




export default function ItemsClient() {
  const { lang } = useLanguage()
  const { site, t } = useUiTranslation()

  const [allItemsBuffer, setAllItemsBuffer] = useState<ItemRow[]>([])
  const [types, setTypes] = useState<ItemTypeRow[]>([])
  const [translationKeys, setTranslationKeys] = useState<string[]>([])

  const [loading, setLoading] = useState(true)
  const [bufferLoading, setBufferLoading] = useState(false)

  // gate: só renderiza lista quando preload do buffer terminou
  const [i18nReady, setI18nReady] = useState(false)

  const [filters, setFilters] = useState({
    itemType: '',
    quality: '',
    rarity: '',
    search: '',
  })

  const [sortBy, setSortBy] = useState<'id' | 'name' | 'quality' | 'type'>('id')

  const [usedInIndex, setUsedInIndex] = useState<UsedInIndex>({})
  const [usedInLoading, setUsedInLoading] = useState(false)

  // Traduções (UI + buffer)
  const { translations, isReady: translationsReady } = useTranslation(translationKeys)

  const getT = useCallback(
    (key?: string) => {
      if (!key) return ''
      return translations[key] || key
    },
    [translations]
  )

  // Buffer de itens + índice used-in + tipos em paralelo
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setBufferLoading(true)
      setUsedInLoading(true)
      setLoading(true)
      try {
        const [buffer, idx, typesResult] = await Promise.all([
          loadAllItemsBuffer(),
          buildUsedInIndex(),
          supabase
            .from('ItemTypeConfig')
            .select('id,itemType,name,normal_tag_name,select_tag_name')
            .order('id'),
        ])

        const safeTypes = ((typesResult.data || []) as any[]).map((t) => ({
          ...t,
          id: toNum(t.id),
        })) as ItemTypeRow[]

        if (!cancelled) {
          setAllItemsBuffer(buffer)
          setUsedInIndex(idx)
          setTypes(safeTypes)
        }
      } catch (error) {
        console.error('Failed to load items page data:', error)
      } finally {
        if (!cancelled) {
          setBufferLoading(false)
          setUsedInLoading(false)
          setLoading(false)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  // ✅ Pré-calcula as chaves LC_ do buffer (evita varrer o buffer repetidamente em effects diferentes)
  const bufferI18nKeys = useMemo(() => {
    if (!allItemsBuffer.length) return [] as string[]
    const keys: string[] = []
    for (const it of allItemsBuffer) {
      if (it.name?.startsWith('LC_')) keys.push(it.name)
      if (it.desc?.startsWith('LC_')) keys.push(it.desc)
    }
    return keys
  }, [allItemsBuffer])

  // ✅ Coletar chaves de tradução (UI + tipos + qualidades + NOME + DESC do buffer inteiro)
  useEffect(() => {
    const keys = new Set<string>()

    for (const k of UI_STATIC_KEYS) keys.add(k)

    for (const t of types) {
      if (t.name) keys.add(t.name)
      if (t.normal_tag_name) keys.add(t.normal_tag_name)
      if (t.select_tag_name) keys.add(t.select_tag_name)
    }

    for (const q of QUALITY_KEYS) keys.add(q)

    for (const k of bufferI18nKeys) keys.add(k)

    setTranslationKeys(Array.from(keys))
  }, [types, bufferI18nKeys])

  // ✅ PRELOAD: antes de renderizar a lista, popula cache do idioma com NOME + DESC do buffer inteiro
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!bufferI18nKeys.length) return

      setI18nReady(false)
      await preloadTranslations(lang, bufferI18nKeys)

      if (!cancelled) setI18nReady(true)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [lang, bufferI18nKeys])

  const typeOptions = useMemo(() => {
    return types.map((t) => ({
      value: String(t.itemType),
      label:
        getT(t.name) ||
        getT(t.select_tag_name) ||
        getT(t.normal_tag_name) ||
        String(t.itemType),
    }))
  }, [types, getT])

  // ✅ Aplicar filtros/ordenação em todo o buffer
  const processed = useMemo(() => {
    if (!allItemsBuffer.length) return []

    const search = filters.search.toLowerCase()

    let result = allItemsBuffer.filter((it) => {
      const matchesType = !filters.itemType || String(it.type ?? '') === filters.itemType
      const matchesQuality = !filters.quality || String(it.quality ?? '') === filters.quality
      const matchesRarity =
        !filters.rarity ||
        (filters.rarity === 'rare' ? toBool(it.isRare) : !toBool(it.isRare))

      const name = getT(it.name).toLowerCase()
      const matchesSearch = !search || name.includes(search)

      return matchesType && matchesQuality && matchesRarity && matchesSearch
    })

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return getT(a.name).localeCompare(getT(b.name))
        case 'quality':
          return toNum(b.quality) - toNum(a.quality)
        case 'type':
          return String(a.type ?? '').localeCompare(String(b.type ?? ''))
        case 'id':
        default:
          return a.id - b.id
      }
    })

    return result
  }, [allItemsBuffer, filters, getT, sortBy])

  const resetFilters = () => setFilters({ itemType: '', quality: '', rarity: '', search: '' })

  if (loading) {
    return (
      <div className="panel text-center py-8">
        <p className="text-sm text-text-muted">{getT('Loading initial data...')}</p>
      </div>
    )
  }

  return (
    <ListPagePanel>
      <h2 className="mb-4 text-xl font-bold tracking-wide text-foreground sm:text-2xl">
        {t(UI_KEYS.nav.items)}
      </h2>

      <CatalogFilterBar onClear={resetFilters} resultCount={processed.length} resultLabel={site('found')}>
        <Select
          label={site('category')}
          value={filters.itemType}
          onChange={(e) => setFilters((prev) => ({ ...prev, itemType: e.target.value }))}
          disabled={bufferLoading}
        >
          <option value="">{t(UI_KEYS.filter.all)}</option>
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Select
          label={t(UI_KEYS.common.quality)}
          value={filters.quality}
          onChange={(e) => setFilters((prev) => ({ ...prev, quality: e.target.value }))}
          disabled={bufferLoading}
        >
          <option value="">{t(UI_KEYS.filter.all)}</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((q) => (
            <option key={q} value={q}>
              {getT(`LC_COMMON_quality_name_${q}`)}
            </option>
          ))}
        </Select>

        <Select
          label={site('rarity')}
          value={filters.rarity}
          onChange={(e) => setFilters((prev) => ({ ...prev, rarity: e.target.value }))}
          disabled={bufferLoading}
        >
          <option value="">{t(UI_KEYS.filter.all)}</option>
          <option value="rare">{site('rare')}</option>
          <option value="normal">{site('normal')}</option>
        </Select>

        <Select
          label={site('sortBy')}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'id' | 'name' | 'quality' | 'type')}
          disabled={bufferLoading}
        >
          <option value="id">{site('id')}</option>
          <option value="name">{site('name')}</option>
          <option value="quality">{t(UI_KEYS.common.quality)}</option>
          <option value="type">{site('category')}</option>
        </Select>

        <Input
          label={t(UI_KEYS.filter.search)}
          type="text"
          placeholder={site('searchItemPlaceholder')}
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          disabled={bufferLoading}
          className="min-w-[200px] flex-1"
        />
      </CatalogFilterBar>

      {usedInLoading ? (
        <p className="mb-3 text-xs text-text-muted">{site('buildingUsedInIndex')}</p>
      ) : null}

      {bufferLoading || !i18nReady || !translationsReady ? (
        <LoadingSkeleton variant="grid" count={6} />
      ) : (
        <ItemsTable
          items={processed}
          getT={getT}
          resolveTexturePath={resolveTexturePath}
          lang={lang}
          usedInIndex={usedInIndex}
          bufferLoaded={!bufferLoading}
          totalItems={allItemsBuffer.length}
        />
      )}
    </ListPagePanel>
  )
}
