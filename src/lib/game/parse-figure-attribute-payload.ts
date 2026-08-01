import { parseGameData } from '@/lib/game/parse-game-data'

/** FigureAttributeConfig.lua format indices as string keys (icon / datamine payload). */
export const FIGURE_ATTRIBUTE_PAYLOAD = {
  id: '1',
  name: '2',
  desc: '3',
  get_path: '4',
  figure_path: '5',
  icon_path: '6',
  figure_initial_quality: '10',
  figure_final_quality: '11',
  obj_id: '17',
  isRare: '20',
  id_hero: '21',
} as const

export type FigureAttributeParsed = {
  id: number
  name: string | null
  desc: string | null
  figurePath: string | null
  iconPath: string | null
  figureInitialQuality: number | null
  figureFinalQuality: number | null
  objId: number | null
  idHero: number | null
  isRare: boolean | null
}

function asDict(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>
  }
  const parsed = parseGameData(payload)
  if (parsed.length === 1 && parsed[0] && typeof parsed[0] === 'object' && !Array.isArray(parsed[0])) {
    return parsed[0] as Record<string, unknown>
  }
  return {}
}

function strField(row: Record<string, unknown>, key: string): string | null {
  const v = row[key]
  return typeof v === 'string' && v.trim() ? v : null
}

function numField(row: Record<string, unknown>, key: string): number | null {
  const v = row[key]
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function parseFigureAttributePayload(
  payload: unknown,
  fallbackId?: number
): FigureAttributeParsed {
  const row = asDict(payload)
  const id = numField(row, FIGURE_ATTRIBUTE_PAYLOAD.id) ?? Number(fallbackId ?? 0)
  const rare = row[FIGURE_ATTRIBUTE_PAYLOAD.isRare]
  return {
    id: Number.isFinite(id) ? id : Number(fallbackId ?? 0),
    name: strField(row, FIGURE_ATTRIBUTE_PAYLOAD.name),
    desc: strField(row, FIGURE_ATTRIBUTE_PAYLOAD.desc),
    figurePath: strField(row, FIGURE_ATTRIBUTE_PAYLOAD.figure_path),
    iconPath: strField(row, FIGURE_ATTRIBUTE_PAYLOAD.icon_path),
    figureInitialQuality: numField(row, FIGURE_ATTRIBUTE_PAYLOAD.figure_initial_quality),
    figureFinalQuality: numField(row, FIGURE_ATTRIBUTE_PAYLOAD.figure_final_quality),
    objId: numField(row, FIGURE_ATTRIBUTE_PAYLOAD.obj_id),
    idHero: numField(row, FIGURE_ATTRIBUTE_PAYLOAD.id_hero),
    isRare: typeof rare === 'boolean' ? rare : null,
  }
}
