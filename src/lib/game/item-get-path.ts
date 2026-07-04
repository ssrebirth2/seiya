import { translateKeys } from '@/lib/i18n/language-package'
import { DEFAULT_SITE_LANGUAGE } from '@/lib/i18n/site-languages'
import { gameTextureToPublicPath } from '@/lib/game/fun-open-icons'

export type GetPathConfigEntry = {
  funopenId: number
  type: number
  value?: unknown
}

export type FunOpenResourceEntry = {
  nameKey?: string | null
  descKey?: string | null
  uiType?: string | null
  iconPath?: string | null
}

export type ItemGetPathIndex = {
  generatedAt: string
  defaultArea: string
  areas: string[]
  byItemId: Record<string, Partial<Record<string, GetPathConfigEntry[]>>>
  areaKeyPaths: Record<string, GetPathConfigEntry[]>
  funOpen: Record<string, FunOpenResourceEntry>
}

export type ItemGetPathDisplay = {
  funopenId: number
  name: string
  iconUrl?: string
  uiType?: string
}

export type ItemGetPathRegionGroup = {
  area: GameArea
  areaLabel: string
  entries: ItemGetPathDisplay[]
}

export type ItemGetPathSourceRow = {
  entry: ItemGetPathDisplay
  areas: GameArea[]
  areaLabels: string[]
}

export function getPathEntryKey(entry: ItemGetPathDisplay): string {
  return `${entry.funopenId}:${entry.name}`
}

function getPathSignature(entries: ItemGetPathDisplay[]): string {
  return entries.map((e) => e.funopenId).join(',')
}

/** True when every region exposes the same funopen entries in the same order. */
export function regionsHaveIdenticalGetPaths(groups: ItemGetPathRegionGroup[]): boolean {
  const visible = groups.filter((g) => g.entries.length > 0)
  if (visible.length <= 1) return true
  const first = getPathSignature(visible[0].entries)
  return visible.every((g) => getPathSignature(g.entries) === first)
}

/** Merge duplicate sources across regions; badges list which servers share each source. */
export function groupItemGetPathsBySource(groups: ItemGetPathRegionGroup[]): ItemGetPathSourceRow[] {
  const visible = groups.filter((g) => g.entries.length > 0)
  const areaOrder = new Map<GameArea, number>(GAME_AREAS.map((area, index) => [area, index]))
  const rows = new Map<
    string,
    { entry: ItemGetPathDisplay; areas: Set<GameArea>; areaLabels: Map<GameArea, string> }
  >()

  for (const group of visible) {
    for (const entry of group.entries) {
      const key = getPathEntryKey(entry)
      let row = rows.get(key)
      if (!row) {
        row = { entry, areas: new Set(), areaLabels: new Map() }
        rows.set(key, row)
      }
      row.areas.add(group.area)
      row.areaLabels.set(group.area, group.areaLabel)
    }
  }

  const sortAreas = (areas: GameArea[]) =>
    [...areas].sort((a, b) => (areaOrder.get(a) ?? 0) - (areaOrder.get(b) ?? 0))

  return [...rows.values()].map((row) => {
    const areas = sortAreas([...row.areas])
    return {
      entry: row.entry,
      areas,
      areaLabels: areas.map((area) => row.areaLabels.get(area)!),
    }
  })
}

const GAME_AREAS = ['Asia', 'China', 'Europe', 'Japan', 'SoutheastAsia'] as const
export type GameArea = (typeof GAME_AREAS)[number]

/** Server region labels — mirrored from game LanguageAreaNameType keys in ItemConfig.get_path. */
const GAME_AREA_LABELS: Record<GameArea, Record<string, string>> = {
  Asia: {
    EN: 'Asia',
    CN: '亚洲',
    PT: 'Ásia',
    SP: 'Asia',
    FR: 'Asie',
    ID: 'Asia',
  },
  China: {
    EN: 'China',
    CN: '中国',
    PT: 'China',
    SP: 'China',
    FR: 'Chine',
    ID: 'Tiongkok',
  },
  Europe: {
    EN: 'Europe',
    CN: '欧洲',
    PT: 'Europa',
    SP: 'Europa',
    FR: 'Europe',
    ID: 'Eropa',
  },
  Japan: {
    EN: 'Japan',
    CN: '日本',
    PT: 'Japão',
    SP: 'Japón',
    FR: 'Japon',
    ID: 'Jepang',
  },
  SoutheastAsia: {
    EN: 'Southeast Asia',
    CN: '东南亚',
    PT: 'Sudeste Asiático',
    SP: 'Sudeste Asiático',
    FR: 'Asie du Sud-Est',
    ID: 'Asia Tenggara',
  },
}

export function gameAreaLabel(area: GameArea, lang: string): string {
  const labels = GAME_AREA_LABELS[area]
  const code = lang.toUpperCase()
  return labels[code] ?? labels[DEFAULT_SITE_LANGUAGE] ?? area
}

let indexCache: ItemGetPathIndex | null = null

export async function loadItemGetPathIndex(): Promise<ItemGetPathIndex | null> {
  if (indexCache) return indexCache
  try {
    const res = await fetch('/data/item-get-path-index.json')
    if (!res.ok) return null
    indexCache = (await res.json()) as ItemGetPathIndex
    return indexCache
  } catch {
    return null
  }
}

/** Flat ItemConfig.get_path array → regional object (Supabase import shape). */
export function normalizeRegionalGetPath(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null
  if (Array.isArray(raw)) {
    if (raw.length < 6) return null
    return {
      Asia: raw[0],
      China: raw[1],
      Europe: raw[2],
      Japan: raw[3],
      SoutheastAsia: raw[4],
      is_area_key: raw[5],
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>
  return null
}

export function defaultGameAreaForSiteLang(lang: string): GameArea {
  const code = lang.toUpperCase()
  if (code === 'EN') return 'Europe'
  if (code === 'SP') return 'Europe'
  if (code === 'FR') return 'Europe'
  if (code === 'ID') return 'SoutheastAsia'
  return 'China'
}

function dedupePaths(paths: GetPathConfigEntry[]): GetPathConfigEntry[] {
  const seen = new Set<string>()
  const out: GetPathConfigEntry[] = []
  for (const path of paths) {
    const key = `${path.funopenId}:${path.type}:${JSON.stringify(path.value ?? null)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(path)
  }
  return out
}

export function resolveGetPathEntriesFromIndex(
  index: ItemGetPathIndex,
  itemId: number,
  area: GameArea = index.defaultArea as GameArea
): GetPathConfigEntry[] {
  const perArea = index.byItemId[String(itemId)]
  if (!perArea) return []
  const paths = perArea[area]
  return paths?.length ? dedupePaths(paths) : []
}

function buildGetPathDisplays(
  paths: GetPathConfigEntry[],
  index: ItemGetPathIndex,
  translations: Record<string, string>
): ItemGetPathDisplay[] {
  const displays: ItemGetPathDisplay[] = []
  for (const path of paths) {
    const fun = index.funOpen[String(path.funopenId)]
    if (!fun?.nameKey) continue
    const name = translations[fun.nameKey] || fun.nameKey
    const iconUrl = fun.iconPath ? gameTextureToPublicPath(fun.iconPath) : undefined
    displays.push({
      funopenId: path.funopenId,
      name,
      iconUrl,
      uiType: fun.uiType ?? undefined,
    })
  }
  return displays
}

/** All server regions with get_path data for an item (not filtered by site language). */
export async function resolveItemGetPathByRegion(
  itemId: number,
  lang: string
): Promise<ItemGetPathRegionGroup[]> {
  const index = await loadItemGetPathIndex()
  if (!index) return []

  const perArea = index.byItemId[String(itemId)]
  if (!perArea) return []

  const areas = (index.areas.length ? index.areas : [...GAME_AREAS]) as GameArea[]
  const regionPaths: { area: GameArea; paths: GetPathConfigEntry[] }[] = []
  const lcKeys = new Set<string>()

  for (const area of areas) {
    const paths = resolveGetPathEntriesFromIndex(index, itemId, area)
    if (!paths.length) continue
    regionPaths.push({ area, paths })
    for (const path of paths) {
      const fun = index.funOpen[String(path.funopenId)]
      if (fun?.nameKey) lcKeys.add(fun.nameKey)
    }
  }

  if (!regionPaths.length) return []

  const translations = lcKeys.size ? await translateKeys([...lcKeys], lang) : {}

  return regionPaths.map(({ area, paths }) => ({
    area,
    areaLabel: gameAreaLabel(area, lang),
    entries: buildGetPathDisplays(paths, index, translations),
  }))
}

/** Single region — kept for callers that only need one area. */
export async function resolveItemGetPathDisplays(
  itemId: number,
  lang: string,
  area?: GameArea
): Promise<ItemGetPathDisplay[]> {
  const groups = await resolveItemGetPathByRegion(itemId, lang)
  if (area) {
    return groups.find((g) => g.area === area)?.entries ?? []
  }
  return groups.flatMap((g) => g.entries)
}

export function collectGetPathTranslationKeys(
  index: ItemGetPathIndex,
  itemId: number,
  area: GameArea
): string[] {
  const paths = resolveGetPathEntriesFromIndex(index, itemId, area)
  const keys = new Set<string>()
  for (const path of paths) {
    const fun = index.funOpen[String(path.funopenId)]
    if (fun?.nameKey) keys.add(fun.nameKey)
  }
  return [...keys]
}
