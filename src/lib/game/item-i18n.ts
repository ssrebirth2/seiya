import { translateKeys } from '@/lib/i18n/language-package'

import { UI_KEYS } from '@/lib/i18n/ui-keys'



/** LC key patterns from ItemConfig.lua */

export function itemNameKey(id: number): string {

  return `LC_ITEM_itemname_${id}`

}



export function itemDescKey(id: number): string {

  return `LC_ITEM_itemdes_${id}`

}



export function isLcKey(value?: string | null): boolean {

  return typeof value === 'string' && value.startsWith('LC_')

}



/** BagItemInfoView:CheckShowBoxAward — child_type → section label. */

export function boxAwardSectionKey(childType?: string | number | null): string | null {

  const t = String(childType ?? '').toLowerCase()

  if (t === 'immobilizationbox') return UI_KEYS.item.boxAwardFixed

  if (t === 'selectbox') return UI_KEYS.item.boxAwardSelect

  if (t === 'randombox' || t === 'randombox_psychedelic' || t === 'firework') {

    return UI_KEYS.item.boxAwardRandom

  }

  return null

}



export type ItemTextRow = {

  id?: number

  name: string

  desc?: string | null

  des_value?: unknown

}



export type ResolvedItemText = {

  nameKey: string

  descKey?: string

  name: string

  descHtml?: string

}



/** Port of ItemConfig.des_value / desc_value (JSON array of LC keys). */

export function parseDesValue(val: unknown): string[] {

  if (!val) return []

  if (Array.isArray(val)) {

    return val.filter((x): x is string => typeof x === 'string' && x.length > 0)

  }

  if (typeof val === 'string') {

    const trimmed = val.trim()

    if (!trimmed) return []

    if (trimmed.startsWith('[')) {

      try {

        const parsed = JSON.parse(trimmed)

        if (Array.isArray(parsed)) {

          return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0)

        }

      } catch {

        return []

      }

    }

    if (isLcKey(trimmed)) return [trimmed]

  }

  return []

}



/** Port of GetLCString(template, ...args) placeholder substitution. */

export function applyLcPlaceholders(template: string, args: string[]): string {

  let result = template

  for (let i = 0; i < args.length; i++) {

    const placeholder = `{${i}}`

    if (!result.includes(placeholder)) continue

    result = result.split(placeholder).join(args[i])

  }

  return result

}



function resolveDesArgs(desValue: unknown, tmap: Record<string, string>): string[] {

  return parseDesValue(desValue).map((key) => (isLcKey(key) ? tmap[key] || key : key))

}



function resolveItemField(

  fieldKey: string,

  fallback: string | undefined,

  desValue: unknown,

  tmap: Record<string, string>

): string {

  const template = tmap[fieldKey] || fallback || fieldKey

  const args = resolveDesArgs(desValue, tmap)

  return args.length ? applyLcPlaceholders(template, args) : template

}



export function collectItemLcKeys(rows: ItemTextRow[]): string[] {

  const keys = new Set<string>()

  for (const row of rows) {

    if (isLcKey(row.name)) keys.add(row.name)

    else if (row.id != null) keys.add(itemNameKey(row.id))

    if (isLcKey(row.desc)) keys.add(row.desc!)

    else if (row.desc && row.id != null) keys.add(itemDescKey(row.id))

    for (const key of parseDesValue(row.des_value)) {

      if (isLcKey(key)) keys.add(key)

    }

  }

  return [...keys]

}



/** Port of GameUtil.GetItemNameByConfig — applies des_value args to name LC. */

export function resolveItemNameFromRow(

  row: Pick<ItemTextRow, 'id' | 'name' | 'des_value'>,

  tmap: Record<string, string>

): string {

  const nameKey = isLcKey(row.name) ? row.name : row.id != null ? itemNameKey(row.id) : row.name

  return resolveItemField(nameKey, row.name, row.des_value, tmap)

}



export async function resolveItemTexts(

  row: ItemTextRow,

  lang: string,

  translations?: Record<string, string>

): Promise<ResolvedItemText> {

  const nameKey = isLcKey(row.name) ? row.name : row.id != null ? itemNameKey(row.id) : row.name

  const descKey = row.desc

    ? isLcKey(row.desc)

      ? row.desc

      : row.id != null

        ? itemDescKey(row.id)

        : undefined

    : row.id != null

      ? itemDescKey(row.id)

      : undefined



  const keys = collectItemLcKeys([row])

  const tmap = translations ?? (keys.length ? await translateKeys(keys, lang) : {})



  const name = resolveItemField(nameKey, row.name, row.des_value, tmap)

  const descHtml = descKey

    ? resolveItemField(descKey, row.desc || undefined, row.des_value, tmap)

    : row.desc || undefined



  return { nameKey, descKey, name, descHtml }

}



export async function resolveItemTextsBatch(

  rows: ItemTextRow[],

  lang: string

): Promise<Map<number, ResolvedItemText>> {

  const keys = collectItemLcKeys(rows)

  const tmap = keys.length ? await translateKeys(keys, lang) : {}

  const out = new Map<number, ResolvedItemText>()



  for (const row of rows) {

    if (row.id == null) continue

    out.set(row.id, await resolveItemTexts(row, lang, tmap))

  }

  return out

}



export type ItemConfigNameRow = {

  id: number

  name: string

  des_value?: unknown

}



/** Load translated display names for ItemConfig rows (consume lists, ref maps). */

export async function translateItemConfigNames(

  rows: ItemConfigNameRow[],

  lang: string

): Promise<Map<number, { name: string; nameKey: string }>> {

  const out = new Map<number, { name: string; nameKey: string }>()

  if (!rows.length) return out



  const tmap = await translateKeys(collectItemLcKeys(rows), lang)

  for (const row of rows) {

    const nameKey = isLcKey(row.name) ? row.name : itemNameKey(row.id)

    out.set(row.id, {

      name: resolveItemNameFromRow(row, tmap),

      nameKey,

    })

  }

  return out

}



/** Parse get_path JSON — returns LC keys to translate. */

export function collectGetPathLcKeys(getPath: unknown): string[] {

  if (!getPath) return []

  let obj: Record<string, unknown> | null = null

  if (typeof getPath === 'string') {

    try {

      obj = JSON.parse(getPath) as Record<string, unknown>

    } catch {

      return isLcKey(getPath) ? [getPath] : []

    }

  } else if (typeof getPath === 'object') {

    obj = getPath as Record<string, unknown>

  }

  if (!obj) return []



  const keys: string[] = []

  for (const [k, v] of Object.entries(obj)) {

    if (k === 'is_area_key') continue

    if (typeof v === 'string' && isLcKey(v)) keys.push(v)

    if (Array.isArray(v)) {

      for (const entry of v) {

        if (typeof entry === 'string' && isLcKey(entry)) keys.push(entry)

      }

    }

  }

  return keys

}


