import { parseGameData, parsePrimitiveList } from '@/lib/game/parse-game-data'

/** ClothConfig.lua format indices (1-based) → 0-based array payload. */
const CLOTH = {
  clothid: 0,
  show_icon_path: 5,
  clothname: 7,
  clothpartlist: 8,
  texpath: 4,
} as const

/** GalleryClothInfoConfig.lua format → 0-based array payload. */
const GALLERY_CLOTH = {
  id: 0,
  cloth_id: 1,
  name: 2,
  desc: 3,
  type: 4,
} as const

/** ClothPartConfig.lua format indices as string keys in icon-builder payload. */
const PART = {
  id: '1',
  clothid: '2',
  pos: '3',
  path: '5',
} as const

function asArrayPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  return parseGameData(payload)
}

function asDictPayload(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>
  }
  return {}
}

export type ClothConfigParsed = {
  clothId: number
  showIconPath: string | null
  clothNameKey: string | null
  partIds: number[]
  shadowPath: string | null
}

export function parseClothConfigPayload(payload: unknown, fallbackId?: number): ClothConfigParsed {
  const row = asArrayPayload(payload)
  const clothId = Number(row[CLOTH.clothid] ?? fallbackId ?? 0)
  const showIcon = row[CLOTH.show_icon_path]
  const name = row[CLOTH.clothname]
  const shadow = row[CLOTH.texpath]
  return {
    clothId: Number.isFinite(clothId) ? clothId : Number(fallbackId ?? 0),
    showIconPath: typeof showIcon === 'string' && showIcon.trim() ? showIcon : null,
    clothNameKey: typeof name === 'string' && name.trim() ? name : null,
    partIds: parsePrimitiveList(row[CLOTH.clothpartlist])
      .map(Number)
      .filter((n) => Number.isFinite(n)),
    shadowPath: typeof shadow === 'string' && shadow.trim() ? shadow : null,
  }
}

export type GalleryClothInfoParsed = {
  id: number
  clothId: number
  nameKey: string | null
  descKey: string | null
}

export function parseGalleryClothInfoPayload(
  payload: unknown,
  fallbackId?: number
): GalleryClothInfoParsed {
  const row = asArrayPayload(payload)
  const id = Number(row[GALLERY_CLOTH.id] ?? fallbackId ?? 0)
  const clothId = Number(row[GALLERY_CLOTH.cloth_id] ?? id)
  const name = row[GALLERY_CLOTH.name]
  const desc = row[GALLERY_CLOTH.desc]
  return {
    id: Number.isFinite(id) ? id : Number(fallbackId ?? 0),
    clothId: Number.isFinite(clothId) ? clothId : Number(fallbackId ?? 0),
    nameKey: typeof name === 'string' && name.trim() ? name : null,
    descKey: typeof desc === 'string' && desc.trim() ? desc : null,
  }
}

export type ClothPartParsed = {
  id: number
  clothId: number
  pos: number
  path: string | null
}

export function parseClothPartPayload(payload: unknown, fallbackId?: number): ClothPartParsed {
  const row = asDictPayload(payload)
  const id = Number(row[PART.id] ?? fallbackId ?? 0)
  const clothId = Number(row[PART.clothid] ?? 0)
  const pos = Number(row[PART.pos] ?? 0)
  const path = row[PART.path]
  return {
    id: Number.isFinite(id) ? id : Number(fallbackId ?? 0),
    clothId: Number.isFinite(clothId) ? clothId : 0,
    pos: Number.isFinite(pos) ? pos : 0,
    path: typeof path === 'string' && path.trim() ? path : null,
  }
}
