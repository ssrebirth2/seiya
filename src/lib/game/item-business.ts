import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { normalizeConsumeList } from '@/lib/game/parse-game-data'
import { boxAwardSectionKey } from '@/lib/game/item-i18n'

export type UsedInCraft = { targetId: number; qty: number }
export type UsedInIndex = Record<number, UsedInCraft[]>

export type BoxAwardEntry = {
  award: ConsumeEntry & { quality?: number }
  rate?: number
  rateLabel?: string | null
}

const toNum = (v: unknown, fallback = 0) => {
  if (v === null || v === undefined) return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function normalizeAwardList(val: unknown): any[] {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val !== 'string') return []
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function pickAwardSid(x: Record<string, unknown>): number | string | null {
  const sid = x.sid
  if (sid !== null && sid !== undefined && sid !== '') return sid as number | string
  const type = x.type
  if (type !== null && type !== undefined && type !== '' && typeof type !== 'object') {
    return String(type)
  }
  return null
}

export function pickAwardQty(x: Record<string, unknown>): number {
  return toNum(x.num ?? x.amount ?? x.count, 0)
}

/** BagItemInfoView — rate stored as percentage × 100 (500 → 5.00%). */
export function formatBoxAwardRate(rate: number): string {
  const pct = rate / 100 + 0.0001
  const s = pct.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
  return `${s}%`
}

function awardQuality(a: Record<string, unknown>): number {
  return toNum(a.quality, 0)
}

/** Sort order from BagItemInfoView:CheckShowBoxAward. */
export function sortBoxAwards(entries: BoxAwardEntry[]): BoxAwardEntry[] {
  return [...entries].sort((a, b) => {
    const qa = awardQuality(a.award as Record<string, unknown>)
    const qb = awardQuality(b.award as Record<string, unknown>)
    if (qa !== qb) return qb - qa

    const sa = pickAwardSid(a.award as Record<string, unknown>)
    const sb = pickAwardSid(b.award as Record<string, unknown>)
    const ta = typeof sa
    const tb = typeof sb
    if (ta !== tb) return ta === 'string' ? -1 : 1
    if (sa !== sb) {
      if (ta === 'number' && tb === 'number') return (sa as number) - (sb as number)
      return String(sa).localeCompare(String(sb))
    }

    const na = pickAwardQty(a.award as Record<string, unknown>)
    const nb = pickAwardQty(b.award as Record<string, unknown>)
    return nb - na
  })
}

export function parseRateList(val: unknown): number[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map((x) => toNum(x, 0))
  if (typeof val !== 'string') return []
  try {
    const parsed = JSON.parse(val)
    if (!Array.isArray(parsed)) return []
    return parsed.map((x) => toNum(x, 0))
  } catch {
    return []
  }
}

export function buildBoxShowAwards(
  awardsRaw: unknown,
  rateListRaw: unknown,
  showRates: boolean
): BoxAwardEntry[] {
  const awards = normalizeAwardList(awardsRaw)
  const rates = parseRateList(rateListRaw)
  const entries: BoxAwardEntry[] = awards.map((raw, idx) => {
    const o = raw as Record<string, unknown>
    const sid = pickAwardSid(o)
    const num = pickAwardQty(o)
    const type = o.type != null ? String(o.type) : sid != null ? 'prop' : undefined
    const rate = rates[idx]
    return {
      award: {
        num,
        sid: typeof sid === 'number' ? sid : undefined,
        type: typeof sid === 'string' && type !== 'prop' ? String(sid) : type,
        quality: awardQuality(o) || undefined,
      },
      rate,
      rateLabel: showRates && rate != null && rate > 0 ? formatBoxAwardRate(rate) : null,
    }
  })
  return sortBoxAwards(entries)
}

export function hasCraftRecipe(compose: unknown): boolean {
  return toNum(compose, 0) !== 0
}

export function boxSectionKeyForChildType(childType?: string | number | null): string | null {
  return boxAwardSectionKey(childType)
}

export async function buildUsedInIndex(
  fetchBatch: (from: number, size: number) => Promise<{ id: number; consume: unknown }[]>
): Promise<UsedInIndex> {
  const index: UsedInIndex = {}
  const BATCH = 1000
  let from = 0

  while (true) {
    const rows = await fetchBatch(from, BATCH)
    if (!rows.length) break

    for (const r of rows) {
      const targetId = toNum(r.id)
      for (const ing of normalizeConsumeList(r.consume)) {
        const sid = ing.sid
        if (!sid) continue
        if (!index[sid]) index[sid] = []
        index[sid].push({ targetId, qty: ing.num })
      }
    }

    if (rows.length < BATCH) break
    from += BATCH
  }

  return index
}

export type ExchangeBlock = {
  labelKey: string
  consume: ConsumeEntry[]
  get: ConsumeEntry[]
}

export function resolveExchangeBlocks(
  exchanges: {
    compose?: { consume_item?: unknown; get_item?: unknown } | null
    decompose?: { consume_item?: unknown; get_item?: unknown } | null
    exchange?: { consume_item?: unknown; get_item?: unknown } | null
  }[]
): ExchangeBlock[] {
  const blocks: ExchangeBlock[] = []
  const add = (labelKey: string, info: { consume_item?: unknown; get_item?: unknown } | null | undefined) => {
    if (!info) return
    const consume = normalizeConsumeList(info.consume_item)
    const get = normalizeConsumeList(info.get_item)
    if (consume.length || get.length) blocks.push({ labelKey, consume, get })
  }

  for (const ex of exchanges) {
    add('compose', ex.compose)
    add('decompose', ex.decompose)
    add('exchange', ex.exchange)
  }
  return blocks
}
