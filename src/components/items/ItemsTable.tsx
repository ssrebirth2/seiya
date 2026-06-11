'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useTranslation } from '@/lib/i18n/use-translation'

const FALLBACK_ICON = '/assets/resources/textures/itemicon/itemicon_10000.png'
const VISIBLE_ITEMS = 30

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

type RefEntity = {
  id: string
  name: string
  icon_path?: string | null
  quality?: number | string | null
  source: 'item' | 'money'
}

type UsedInCraft = { targetId: number; qty: number }
type UsedInIndex = Record<number, UsedInCraft[]>

const toNum = (v: unknown, fallback = 0) => {
  if (v === null || v === undefined) return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

const uniqStr = (arr: string[]) => Array.from(new Set(arr))

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

/**
 * ? IMPORTANTE:
 * - Para itens normais: { sid: 123, num: 2 }
 * - Para box consume rewards (MoneyConfig): { type: "rmb_lcx", num: 1600 }
 *
 * Então: ID pode vir de x.sid OU x.type
 */
const pickSidAny = (x: any): string | null => {
  const sid = x?.sid
  if (sid !== null && sid !== undefined && sid !== '') return String(sid)

  const type = x?.type
  if (type !== null && type !== undefined && type !== '') return String(type)

  return null
}

const pickQtyAny = (x: any) => {
  const v = x?.num ?? x?.amount ?? x?.count ?? 0
  return toNum(v, 0)
}

function collectIdsFromList(list: any[]): string[] {
  const out: string[] = []
  for (const x of list) {
    const id = pickSidAny(x)
    if (id) out.push(id)
  }
  return out
}

// ? rate_list ? lista de rates (base 10000)
function parseRateList(v: unknown): number[] {
  if (!v) return []
  if (Array.isArray(v)) return v.map((x) => toNum(x, 0)).filter((n) => n >= 0)
  if (typeof v !== 'string') return []
  try {
    const parsed = JSON.parse(v)
    if (!Array.isArray(parsed)) return []
    return parsed.map((x) => toNum(x, 0)).filter((n) => n >= 0)
  } catch {
    return []
  }
}

function quality(rate: number): string {
  const pct = (rate / 10000) * 100
  if (Number.isInteger(pct)) return `${pct}%`
  let s = pct.toFixed(2)
  s = s.replace(/0+$/, '')
  s = s.replace(/\.$/, '')
  return `${s}%`
}

/**
 * ? BG path:
 * Você disse que o path é o mesmo do itemicon.
 * Então vira: /assets/resources/textures/itemicon/<item_bg_name_path>.png
 */
function resolveQualityBgPath(bgName?: string | null): string | null {
  if (!bgName) return null
  const cleaned = String(bgName).trim()
  if (!cleaned) return null
  return `/assets/resources/textures/itemicon/${cleaned}.png`
}

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full border border-panel-border bg-panel ${className}`}
    >
      {children}
    </span>
  )
}

function IconWithQualityBg({
  iconSrc,
  bgSrc,
  alt,

  // ? BG define o tamanho FINAL do bloco (container)
  bgSizeClass,

  // ? ícone separado (menor)
  iconScale = 0.75, // diminui/aumenta só o ícone
}: {
  iconSrc: string
  bgSrc: string | null
  alt: string
  bgSizeClass?: string
  iconScale?: number
}) {
  return (
    <div className={`relative ${bgSizeClass} shrink-0`}>
      {bgSrc ? (
        <img
          src={bgSrc}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          loading="lazy"
        />
      ) : null}

      <div className="absolute inset-0 flex justify-center items-start">
  <img
    src={iconSrc}
    alt={alt}
    loading="lazy"
    className="w-full h-full object-contain origin-top"
    style={{ transform: `scale(${iconScale})` }}
    onError={(e) => {
      e.currentTarget.src = FALLBACK_ICON
    }}
  />
</div>
    </div>
  )
}



function MiniEntity({
  id,
  qty,
  refEntity,
  getT,
  resolveTexturePath,
  rightSlot,
  showQtyLine = true,
  qualityBgByQuality,
}: {
  id: string
  qty: number
  refEntity?: RefEntity
  getT: (key?: string) => string
  resolveTexturePath: (raw?: string | null) => string | null
  rightSlot?: React.ReactNode
  showQtyLine?: boolean
  qualityBgByQuality: Record<number, string | null>
}) {
  const icon = resolveTexturePath(refEntity?.icon_path ?? null) || FALLBACK_ICON
  const baseName = refEntity?.name ? getT(refEntity.name) : `${getT('Item')} ${id}`

  const q = toNum(refEntity?.quality, 0)
  const bg = q > 0 ? qualityBgByQuality[q] ?? null : null

  return (
    <div className="flex items-center justify-between gap-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-lg border border-panel-border bg-panel overflow-hidden">
          <IconWithQualityBg iconSrc={icon} bgSrc={bg} alt={baseName} bgSizeClass="w-8 h-8" />
        </div>

        <div className="min-w-0">
          <div className="text-xs font-medium truncate" title={`${baseName} (ID ${id})`}>
            <span>{baseName}</span>{' '}
            <span className="text-[11px] text-text-muted">(ID {id})</span>
          </div>
          {showQtyLine ? <div className="text-[11px] text-text-muted">x{qty || 0}</div> : null}
        </div>
      </div>
      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-panel-border bg-panel p-3">
      <div className="text-xs font-semibold mb-2 uppercase tracking-wide">{title}</div>
      {children}
    </div>
  )
}

export default function ItemsTable({
  items,
  getT: propGetT,
  resolveTexturePath,
  usedInIndex,
  bufferLoaded,
  totalItems,
}: {
  items: ItemRow[]
  getT: (key?: string) => string
  resolveTexturePath: (raw?: string | null) => string | null
  lang: string
  usedInIndex: UsedInIndex
  bufferLoaded: boolean
  totalItems: number
}) {
  const [visibleCount, setVisibleCount] = useState(VISIBLE_ITEMS)
  const [detailsByItemId, setDetailsByItemId] = useState<Record<number, any>>({})
  const [refById, setRefById] = useState<Record<string, RefEntity>>({})
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [loadingMoreDetails, setLoadingMoreDetails] = useState(false)
  const [translationKeys, setTranslationKeys] = useState<string[]>([])
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // ? quality ? bg path
  const [qualityBgByQuality, setQualityBgByQuality] = useState<Record<number, string | null>>({})

  const translations = useTranslation(translationKeys)

  const getTLocal = useCallback(
    (key?: string) => {
      if (!key) return ''
      return translations[key] || key
    },
    [translations]
  )

  const finalGetT = useCallback(
    (key?: string) => {
      if (!key) return ''
      const fromParent = propGetT ? propGetT(key) : key
      if (fromParent && fromParent !== key) return fromParent
      const fromLocal = getTLocal(key)
      return fromLocal || fromParent || key
    },
    [propGetT, getTLocal]
  )

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount])
  const visibleIds = useMemo(() => visibleItems.map((i) => i.id), [visibleItems])

  // Infinite scroll
  useEffect(() => {
    if (!bufferLoaded || items.length <= visibleCount) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && visibleCount < items.length) {
          setVisibleCount((prev) => Math.min(prev + VISIBLE_ITEMS, items.length))
        }
      },
      { rootMargin: '100px', threshold: 0.1 }
    )

    const el = loadMoreRef.current
    if (el) observer.observe(el)

    return () => {
      if (el) observer.unobserve(el)
    }
  }, [bufferLoaded, items.length, visibleCount])

  // Traduções
  useEffect(() => {
    const keys = new Set<string>()

    for (const item of visibleItems) {
      if (item.name?.startsWith('LC_')) keys.add(item.name)
      if (item.desc?.startsWith('LC_')) keys.add(item.desc)
    }

    for (const ent of Object.values(refById)) {
      if (ent.name?.startsWith('LC_')) keys.add(ent.name)
    }

    const staticKeys = [
      'ID',
      'Type',
      'Rare',
      'Craft',
      'Used in Craft',
      'Exchange',
      'Box',
      'Ingredients',
      'Consume',
      'Get',
      'Show Preview',
      'Consume Rewards',
      'Requires',
      'Item',
      'Loading item details...',
      'Loading more details...',
      'Load',
      'more items',
      'Scroll down or click to load more',
      'All',
      'items loaded',
      'No items found',
      'Try adjusting your filters or search terms',
      'Compose',
      'Decompose',
      'Chance',
    ] as const

    for (const k of staticKeys) keys.add(k)

    setTranslationKeys(Array.from(keys))
  }, [visibleItems, refById])

  // ? Busca refs em ItemConfig (ids numéricos) e MoneyConfig (ids string)
  const loadRefEntities = useCallback(async (ids: string[]) => {
    const unique = uniqStr(ids).filter(Boolean)
    if (!unique.length) return []

    const numericIds = unique.filter((x) => /^\d+$/.test(x)).map((x) => Number(x))
    const moneyIds = unique.filter((x) => !/^\d+$/.test(x))

    const out: RefEntity[] = []

    // ItemConfig
    if (numericIds.length) {
      const BATCH = 500
      for (let i = 0; i < numericIds.length; i += BATCH) {
        const part = numericIds.slice(i, i + BATCH)
        const { data } = await supabase.from('ItemConfig').select('id,name,icon_path,quality').in('id', part)
        for (const r of data || []) {
          const id = String((r as any).id)
          out.push({
            id,
            name: (r as any).name,
            icon_path: (r as any).icon_path ?? null,
            quality: (r as any).quality ?? null,
            source: 'item',
          })
        }
      }
    }

    // MoneyConfig
    if (moneyIds.length) {
      const BATCH = 200
      for (let i = 0; i < moneyIds.length; i += BATCH) {
        const part = moneyIds.slice(i, i + BATCH)
        const { data } = await supabase.from('MoneyConfig').select('id,name,icon_path,quality').in('id', part)
        for (const r of data || []) {
          const id = String((r as any).id)
          out.push({
            id,
            name: (r as any).name,
            icon_path: (r as any).icon_path ?? null,
            quality: (r as any).quality ?? null,
            source: 'money',
          })
        }
      }
    }

    return out
  }, [])

  // ? Carrega BGs (ItemQualityConfig) para qualities que aparecem na tela (itens + refs)
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!bufferLoaded) return

      const qualitiesNeeded = new Set<number>()

      for (const it of visibleItems) {
        const q = toNum(it.quality, 0)
        if (q > 0) qualitiesNeeded.add(q)
      }

      for (const ent of Object.values(refById)) {
        const q = toNum(ent.quality, 0)
        if (q > 0) qualitiesNeeded.add(q)
      }

      const missing = Array.from(qualitiesNeeded).filter((q) => qualityBgByQuality[q] === undefined)
      if (!missing.length) return

      try {
        const { data, error } = await supabase
          .from('ItemQualityConfig')
          .select('quality,item_bg_name_path')
          .in('quality', missing)

        if (error) {
          console.error('Error loading ItemQualityConfig:', error)
          return
        }

        const patch: Record<number, string | null> = {}
        for (const r of (data ?? []) as any[]) {
          const q = toNum(r.quality, 0)
          const bgName = r.item_bg_name_path ?? null
          patch[q] = resolveQualityBgPath(bgName)
        }

        // se alguma quality não voltou, seta null pra não ficar tentando pra sempre
        for (const q of missing) {
          if (!(q in patch)) patch[q] = null
        }

        if (!cancelled) {
          setQualityBgByQuality((prev) => ({ ...prev, ...patch }))
        }
      } catch (e) {
        console.error('Error loading item quality BG:', e)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [bufferLoaded, visibleItems, refById, qualityBgByQuality])

  // Carregar detalhes sob demanda
  useEffect(() => {
    let cancelled = false

    const loadDetails = async () => {
      if (!bufferLoaded) return

      const missingIds = visibleIds.filter((id) => !detailsByItemId[id])
      if (missingIds.length === 0) return

      if (missingIds.length > VISIBLE_ITEMS / 2) setLoadingDetails(true)
      else setLoadingMoreDetails(true)

      try {
        const batchSize = 50
        for (let i = 0; i < missingIds.length; i += batchSize) {
          if (cancelled) break
          const batch = missingIds.slice(i, i + batchSize)

          const [compositesRes, exchangeRes, boxConsumeRes, boxShowRes] = await Promise.all([
            supabase.from('CompositeConfig').select('id,consume').in('id', batch),
            supabase.from('ExchangeConfig').select('item_id,compose_id,decompose_id,exchange_id').in('item_id', batch),
            supabase.from('BoxAwardConsumeConfig').select('id,awards').in('id', batch),
            supabase.from('BoxAwardShowConfig').select('id,awards,rate_list').in('id', batch),
          ])

          const composites = compositesRes.data ?? []
          const exchanges = (exchangeRes.data ?? []) as any[]
          const boxConsumes = (boxConsumeRes.data ?? []) as any[]
          const boxShows = (boxShowRes.data ?? []) as any[]

          const compositeById: Record<number, any> = {}
          for (const c of composites as any[]) compositeById[toNum(c.id)] = c

          const exchangesByItemId: Record<number, any[]> = {}
          for (const e of exchanges) {
            const itemId = toNum(e.item_id)
            if (!exchangesByItemId[itemId]) exchangesByItemId[itemId] = []
            exchangesByItemId[itemId].push(e)
          }

          const boxConsumeById: Record<number, any> = {}
          for (const b of boxConsumes) boxConsumeById[toNum(b.id)] = b

          const boxShowById: Record<number, any> = {}
          for (const b of boxShows) boxShowById[toNum(b.id)] = b

          // ExchangeInfo
          const opIds: number[] = []
          for (const e of exchanges) {
            const a = toNum(e.compose_id, 0)
            const b = toNum(e.decompose_id, 0)
            const c = toNum(e.exchange_id, 0)
            if (a) opIds.push(a)
            if (b) opIds.push(b)
            if (c) opIds.push(c)
          }

          const uniqueOpIds = Array.from(new Set(opIds))
          let exInfoById: Record<number, any> = {}

          if (uniqueOpIds.length) {
            const { data: infos } = await supabase
              .from('ExchangeInfoConfig')
              .select('id,consume_item,get_item,exchange_rate')
              .in('id', uniqueOpIds)

            for (const r of (infos ?? []) as any[]) {
              if (!r) continue
              exInfoById[toNum(r.id)] = r
            }
          }

          const batchDetails: Record<number, any> = {}

          for (const itemId of batch) {
            const selfComposite = compositeById[itemId] ?? null
            const selfConsume = selfComposite ? normalizeList(selfComposite.consume) : []
            const hasCraft = selfConsume.length > 0

            const rawExchanges = exchangesByItemId[itemId] ?? []
            const resolvedExchanges = rawExchanges.map((row) => ({
              row,
              compose: row.compose_id ? exInfoById[toNum(row.compose_id)] ?? null : null,
              decompose: row.decompose_id ? exInfoById[toNum(row.decompose_id)] ?? null : null,
              exchange: row.exchange_id ? exInfoById[toNum(row.exchange_id)] ?? null : null,
            }))

            batchDetails[itemId] = {
              composite: hasCraft ? selfComposite : null,
              exchanges: resolvedExchanges,
              boxConsume: boxConsumeById[itemId] ?? null,
              boxShow: boxShowById[itemId] ?? null,
            }
          }

          // refs necessárias
          const idsNeeded: string[] = []

          for (const itemId of batch) {
            const d = batchDetails[itemId]
            if (!d) continue

            if (d.composite) idsNeeded.push(...collectIdsFromList(normalizeList(d.composite.consume)))

            for (const ex of d.exchanges) {
              for (const info of [ex.compose, ex.decompose, ex.exchange]) {
                if (!info) continue
                idsNeeded.push(...collectIdsFromList(normalizeList(info.consume_item)))
                idsNeeded.push(...collectIdsFromList(normalizeList(info.get_item)))
              }
            }

            if (d.boxShow) idsNeeded.push(...collectIdsFromList(normalizeList(d.boxShow.awards)))
            if (d.boxConsume) idsNeeded.push(...collectIdsFromList(normalizeList(d.boxConsume.awards)))

            const used = usedInIndex[itemId] ?? []
            for (const u of used) idsNeeded.push(String(u.targetId))
          }

          const missing = uniqStr(idsNeeded).filter((id) => id && !refById[id])

          if (missing.length > 0 && !cancelled) {
            const fetched = await loadRefEntities(missing)
            if (!cancelled && fetched.length > 0) {
              setRefById((prev) => {
                const copy = { ...prev }
                for (const r of fetched) copy[r.id] = r
                return copy
              })
            }
          }

          if (!cancelled) setDetailsByItemId((prev) => ({ ...prev, ...batchDetails }))
        }
      } catch (error) {
        console.error('Error loading details:', error)
      } finally {
        if (!cancelled) {
          setLoadingDetails(false)
          setLoadingMoreDetails(false)
        }
      }
    }

    loadDetails()
    return () => {
      cancelled = true
    }
  }, [visibleIds, bufferLoaded, usedInIndex, refById, detailsByItemId, loadRefEntities])

  // reset paginação quando lista muda
  useEffect(() => {
    setVisibleCount(VISIBLE_ITEMS)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [items])

  const showLoadMore = visibleCount < items.length
  const itemsRemaining = items.length - visibleCount
  const nextBatchSize = Math.min(VISIBLE_ITEMS, itemsRemaining)

  return (
    <div className="border border-panel-border rounded-xl overflow-hidden bg-panel">
      <table className="w-full">
        <tbody>
          {visibleItems.map((it) => {
            const icon = resolveTexturePath(it.icon_path) || FALLBACK_ICON
            const d = detailsByItemId[it.id]

            const craftConsume = d?.composite ? normalizeList(d.composite.consume) : []
            const hasCraft = craftConsume.length > 0

            const usedInCrafts = usedInIndex[it.id] ?? []
            const hasUsedIn = usedInCrafts.length > 0

            const exBlocks: { label: string; consume: any[]; get: any[] }[] = []
            if (d?.exchanges) {
              for (const ex of d.exchanges) {
                const add = (label: string, info: any | null) => {
                  if (!info) return
                  const c = normalizeList(info.consume_item)
                  const g = normalizeList(info.get_item)
                  if (c.length || g.length) exBlocks.push({ label: finalGetT(label) || label, consume: c, get: g })
                }
                add('Compose', ex.compose)
                add('Decompose', ex.decompose)
                add('Exchange', ex.exchange)
              }
            }
            const hasExchange = exBlocks.length > 0

            const boxShow = d?.boxShow ? normalizeList(d.boxShow.awards) : []
            const boxShowRates = d?.boxShow ? parseRateList(d.boxShow.rate_list) : []
            const boxConsume = d?.boxConsume ? normalizeList(d.boxConsume.awards) : []
            const hasBox = boxShow.length > 0 || boxConsume.length > 0

            const hasRight = hasCraft || hasUsedIn || hasExchange || hasBox

            const q = toNum(it.quality, 0)
            const bg = q > 0 ? qualityBgByQuality[q] ?? null : null

            return (
              <tr
  key={it.id}
  className="border-b border-panel-border last:border-b-0 hover:bg-panel-hover transition-colors"
>
  <td className="p-4">
    <div className="grid grid-cols-12 gap-6 items-start">
      
      {/* ICON */}
      <div className="col-span-12 sm:col-span-2">
        <div className="w-[127px] h-[169px] overflow-hidden flex items-center justify-center">
          <IconWithQualityBg
            iconSrc={icon}
            bgSrc={bg}
            alt={finalGetT(it.name)}
            bgSizeClass="w-full h-full"
          />
        </div>
      </div>

      {/* MAIN INFO */}
      <div className="col-span-12 sm:col-span-10">
        <div className="flex flex-col gap-3">

          {/* HEADER */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xs text-text-muted font-mono">
              {finalGetT('ID')} {it.id}
            </span>
            <h3
              className="text-base font-semibold"
              dangerouslySetInnerHTML={{ __html: finalGetT(it.name) }}
            />
          </div>

          {/* DESCRIPTION */}
          <div
            className="text-sm text-text-muted leading-snug"
            dangerouslySetInnerHTML={{ __html: finalGetT(it.desc) }}
          />

          {/* TAGS */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Pill>
              {finalGetT('Type')}: {String(it.type ?? '-')}
            </Pill>

            {it.isRare && (
              <Pill className="border-icon-artifact/30 bg-icon-artifact/15 text-icon-artifact">
                {finalGetT('Rare')}
              </Pill>
            )}
          </div>

          {/* ========================= */}
          {/* ?? NOVO BOX HORIZONTAL */}
          {/* ========================= */}
          {hasBox && (
            <div className="mt-4">
              <div className="text-xs font-semibold mb-3 uppercase tracking-wide text-text-muted">
                {finalGetT('Box') || 'Box'}
              </div>

              <div className="overflow-x-auto scrollbar-thin">
                <div className="flex gap-4 min-w-max pb-2">

                  {/* SHOW PREVIEW */}
                  {boxShow.map((x, idx) => {
                    const id = pickSidAny(x)
                    if (!id) return null
                    const qty = pickQtyAny(x)

                    const rate = boxShowRates[idx]
                    const chanceLabel =
                      typeof rate === 'number' && rate > 0
                        ? `${quality(rate)}`
                        : null

                    const ref = refById[id]
                    const iconPath =
                      resolveTexturePath(ref?.icon_path) || FALLBACK_ICON
                    const q2 = toNum(ref?.quality, 0)
                    const bg2 =
                      q2 > 0 ? qualityBgByQuality[q2] ?? null : null

                    return (
                      <div
  key={`box-show-${id}-${idx}`}
  className="w-20 shrink-0 rounded-2xl border border-panel-border bg-panel p-4 hover:bg-panel-hover transition-all duration-200"
>
  <div className="flex flex-col items-center gap-3">

    {/* ?? IMAGEM */}
    <div className="relative w-28 h-28">
      <IconWithQualityBg
        iconSrc={iconPath}
        bgSrc={bg2}
        alt={finalGetT(ref?.name)}
        bgSizeClass="w-28 h-28"
        iconScale={0.7}
      />

      {/* ?? QUANTIDADE NA FAIXA */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
        <span className="text-sm font-semibold text-foreground">
          {qty}
        </span>
      </div>
    </div>

    {/* ?? NOME */}
    <div className="text-[13px] font-medium text-center leading-snug px-2">
      <span className="truncate block max-w-[150px]">
        {finalGetT(ref?.name)}
      </span>
    </div>

    {/* ?? DROP RATE ABAIXO DO NOME */}
    {chanceLabel && (
      <div className="text-[11px] text-text-muted font-medium">
        {chanceLabel}
      </div>
    )}
  </div>
</div>


                    )
                  })}

                  {/* CONSUME REWARDS */}
                  {boxConsume.map((x, idx) => {
                    const id = pickSidAny(x)
                    if (!id) return null
                    const qty = pickQtyAny(x)

                    const ref = refById[id]
                    const iconPath =
                      resolveTexturePath(ref?.icon_path) || FALLBACK_ICON
                    const q2 = toNum(ref?.quality, 0)
                    const bg2 =
                      q2 > 0 ? qualityBgByQuality[q2] ?? null : null

                    return (
                      <div
  key={`box-consume-${id}-${idx}`}
  className="relative w-20 shrink-0 rounded-2xl border border-panel-border bg-panel p-4 hover:bg-panel-hover transition-all duration-200"
>
  <div className="flex flex-col items-center gap-3">

    <div className="relative w-28 h-28">
      <IconWithQualityBg
        iconSrc={iconPath}
        bgSrc={bg2}
        alt={finalGetT(ref?.name)}
        bgSizeClass="w-28 h-28"
        iconScale={0.92}
      />

      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
        <span className="text-sm font-semibold text-foreground">
          {qty}
        </span>
      </div>
    </div>

    <div className="text-[13px] font-medium text-center leading-snug px-2">
      <span className="truncate block max-w-[150px]">
        {finalGetT(ref?.name)}
      </span>
    </div>
  </div>
</div>


                    )
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  </td>
</tr>

            )
          })}
        </tbody>
      </table>

      {loadingDetails && (
        <div className="p-8 text-center">
          <div className="animate-pulse">
            <p className="text-sm text-text-muted">
              {finalGetT('Loading item details...') || 'Loading item details...'}
            </p>
          </div>
        </div>
      )}

      {loadingMoreDetails && (
        <div className="px-4 py-3 text-xs text-text-muted border-t border-panel-border text-center">
          {finalGetT('Loading more details...') || 'Loading more details...'}
        </div>
      )}

      {showLoadMore && (
        <div ref={loadMoreRef} className="p-8 text-center border-t border-panel-border">
          <button
            className="px-6 py-3 text-sm rounded-lg border border-panel-border bg-panel hover:bg-panel-hover transition-colors font-medium"
            onClick={() => setVisibleCount((prev) => Math.min(prev + VISIBLE_ITEMS, items.length))}
          >
            {finalGetT('Load') || 'Load'} {nextBatchSize} {finalGetT('more items') || 'more items'}
          </button>
          <p className="text-xs text-text-muted mt-3">
            {finalGetT('Scroll down or click to load more') || 'Scroll down or click to load more'}
          </p>
        </div>
      )}

      {!showLoadMore && items.length > 0 && (
        <div className="p-6 text-center border-t border-panel-border bg-panel-hover">
          <div className="text-sm font-medium text-foreground">
            {items.length} {finalGetT('items loaded') || 'items loaded'}
          </div>
        </div>
      )}

      {items.length === 0 && bufferLoaded && (
        <div className="p-12 text-center">
          <div className="text-lg font-medium text-text-muted mb-2">
            {finalGetT('No items found') || 'No items found'}
          </div>
          <p className="text-sm text-text-muted">
            {finalGetT('Try adjusting your filters or search terms') || 'Try adjusting your filters or search terms'}
          </p>
        </div>
      )}
    </div>
  )
}
