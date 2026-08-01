/**
 * Build item get-path index from CN luaconfig (ItemConfig + AreaKeyConfig + FunOpenResourcesConfig).
 *
 * Usage: node tools/build-item-get-path-index.mjs
 * Output: public/data/item-get-path-index.json
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolveLuaRoot } from './resolve-lua-root.mjs'

dotenv.config({ path: '.env.local' })

const ROOT = process.cwd()
const LUA_ROOT = resolveLuaRoot()

const AREA_KEY_FILE = join(LUA_ROOT, 'game/areaformat/AreaKeyConfig.lua')
const FUN_OPEN_FILE = join(LUA_ROOT, 'game/funopen/FunOpenResourcesConfig.lua')
const OUTPUT = join(ROOT, 'public/data/item-get-path-index.json')
const HIDDEN_ITEM_IDS_TS = join(ROOT, 'src/lib/game/hidden-item-ids.ts')

function loadHiddenItemIds() {
  try {
    const text = readFileSync(HIDDEN_ITEM_IDS_TS, 'utf8')
    const match = text.match(/export const HIDDEN_ITEM_IDS[^[]*\[([^\]]*)\]/)
    if (!match) return new Set()
    return new Set([...match[1].matchAll(/\d+/g)].map((m) => Number(m[0])))
  } catch {
    return new Set()
  }
}

const GAME_AREAS = ['Asia', 'China', 'Europe', 'Japan', 'SoutheastAsia']

function parseSymbolTable(source) {
  const map = new Map()
  const m = source.match(/^local S=\{([^}]*)\}\r?\nlocal T=/s)
  if (!m) return map
  const body = m[1]
  for (const part of body.matchAll(/(?:([nsb])_(\d+))=([^,}]+)/g)) {
    const [, kind, num, raw] = part
    const key = `${kind}_${num}`
    if (raw.startsWith('"')) {
      map.set(key, raw.slice(1, -1))
    } else if (raw === 'true') {
      map.set(key, true)
    } else if (raw === 'false') {
      map.set(key, false)
    } else if (/^-?\d+$/.test(raw)) {
      map.set(key, Number(raw))
    }
  }
  return map
}

function resolveToken(token, sMap, tMap) {
  const trimmed = token.trim()
  if (trimmed === 'nil') return null
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed)
  if (trimmed.startsWith('"')) return trimmed.slice(1, -1)
  const sRef = trimmed.match(/^S\.(b_\d+|n_\d+|s_\d+)$/)
  if (sRef) return sMap.get(sRef[1]) ?? null
  const tRef = trimmed.match(/^T\.(t_\d+)$/)
  if (tRef) {
    const tpl = tMap.get(tRef[1])
    return tpl ? tpl.map((entry) => resolvePathEntry(entry, sMap, tMap)).filter(Boolean) : null
  }
  return null
}

function resolvePathEntry(entry, sMap, tMap) {
  if (!Array.isArray(entry)) return null
  const [funopenId, type, value] = entry
  const id = resolveToken(String(funopenId), sMap, tMap)
  const pathType = resolveToken(String(type), sMap, tMap)
  if (id == null || pathType == null) return null
  let resolvedValue = null
  if (value != null && String(value).trim() !== 'nil') {
    resolvedValue = resolveToken(String(value), sMap, tMap)
  }
  return { funopenId: Number(id), type: Number(pathType), value: resolvedValue }
}

function parseTemplateTable(source) {
  const map = new Map()
  const m = source.match(/local T=\{([\s\S]*?)\r?\n\}\r?\nreturn _G/s)
  if (!m) return map
  for (const tpl of m[1].matchAll(/(t_\d+)=\{([^\r\n]+)\}/g)) {
    const name = tpl[1]
    const body = tpl[2]
    const entries = []
    for (const chunk of body.matchAll(/\{([^\}]+)\}/g)) {
      const parts = chunk[1].split(',').map((p) => p.trim())
      entries.push(parts)
    }
    map.set(name, entries)
  }
  return map
}

function extractConfigRows(source) {
  const rows = []
  const re = /\[(\d+)\]=\{/g
  let match
  while ((match = re.exec(source)) !== null) {
    const id = Number(match[1])
    let i = match.index + match[0].length
    let depth = 1
    const start = i
    while (i < source.length && depth > 0) {
      const ch = source[i]
      if (ch === '{') depth++
      else if (ch === '}') depth--
      i++
    }
    const body = source.slice(start, i - 1)
    rows.push({ id, body })
  }
  return rows
}

/** Extract `{...}` block bodies from a Lua inline table (handles `{{a,b,c}}` and `{{a,b,c},{d,e,f}}`). */
function extractBraceEntryBodies(source) {
  const bodies = []
  for (let i = 0; i < source.length; i++) {
    if (source[i] !== '{') continue
    let depth = 0
    const start = i
    for (let j = i; j < source.length; j++) {
      const ch = source[j]
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          bodies.push(source.slice(start + 1, j))
          i = j
          break
        }
      }
    }
  }
  return bodies
}

function parseInlineGetPathEntries(rawGetPath, sMap, tMap) {
  const paths = []
  for (const body of extractBraceEntryBodies(rawGetPath)) {
    if (body.includes('{')) {
      for (const inner of extractBraceEntryBodies(body)) {
        const parts = inner.split(',').map((p) => p.trim())
        const entry = resolvePathEntry(parts, sMap, tMap)
        if (entry) paths.push(entry)
      }
      continue
    }
    const parts = body.split(',').map((p) => p.trim())
    const entry = resolvePathEntry(parts, sMap, tMap)
    if (entry) paths.push(entry)
  }
  return paths
}

function parseAreaKeyGetPaths(source) {
  const sMap = parseSymbolTable(source)
  const tMap = parseTemplateTable(source)
  const areaKeyPaths = {}

  for (const row of extractConfigRows(source)) {
    const id = row.id
    const fields = splitTopLevelFields(row.body)
    if (fields.length < 12) continue
    const rawGetPath = fields[11]
    if (!rawGetPath || rawGetPath === 'nil') continue

    let paths = null
    if (rawGetPath.startsWith('T.')) {
      paths = resolveToken(rawGetPath, sMap, tMap)
    } else if (rawGetPath.startsWith('{{')) {
      paths = parseInlineGetPathEntries(rawGetPath, sMap, tMap)
    }
    if (paths?.length) areaKeyPaths[String(id)] = paths
  }

  return { areaKeyPaths, sMap }
}

function splitTopLevelFields(body) {
  const fields = []
  let current = ''
  let depth = 0
  for (const ch of body) {
    if (ch === '{') depth++
    if (ch === '}') depth--
    if (ch === ',' && depth === 0) {
      fields.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) fields.push(current.trim())
  return fields
}

function parseFunOpenResources(source, sMap) {
  const funOpen = {}
  for (const row of extractConfigRows(source)) {
    const id = row.id
    const fields = splitTopLevelFields(row.body)
    if (fields.length < 11) continue

    const nameKey = fields[2]?.startsWith('"') ? fields[2].slice(1, -1) : null
    const uiType = fields[3]?.startsWith('"') ? fields[3].slice(1, -1) : null
    const getPathIconRaw = fields[6]
    const getPathName = fields[9]?.startsWith('"') ? fields[9].slice(1, -1) : null
    const getPathDesc = fields[10]?.startsWith('"') ? fields[10].slice(1, -1) : null

    let iconPath = null
    if (getPathIconRaw?.startsWith('S.')) {
      const resolved = resolveToken(getPathIconRaw, sMap, new Map())
      if (typeof resolved === 'string' && resolved.startsWith('Textures/')) iconPath = resolved
    }

    funOpen[String(id)] = {
      nameKey: getPathName || nameKey,
      descKey: getPathDesc,
      uiType,
      iconPath,
    }
  }
  return funOpen
}

function normalizeRegionalGetPath(raw) {
  if (!raw) return null
  if (Array.isArray(raw)) {
    if (raw.length < 6) return null
    const out = { is_area_key: Boolean(raw[5]) }
    for (let i = 0; i < GAME_AREAS.length; i++) out[GAME_AREAS[i]] = Number(raw[i])
    return out
  }
  if (typeof raw === 'object') return raw
  return null
}

async function loadItemGetPaths() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars in .env.local')
  const sb = createClient(url, key)
  const { data, error } = await sb.from('ItemConfig').select('id,get_path').not('get_path', 'is', null)
  if (error) throw error
  return data ?? []
}

function buildItemIndex(items, areaKeyPaths, hiddenItemIds) {
  const byItemId = {}
  for (const row of items) {
    if (hiddenItemIds.has(Number(row.id))) continue
    const regional = normalizeRegionalGetPath(row.get_path)
    if (!regional?.is_area_key) continue

    const perArea = {}
    for (const area of GAME_AREAS) {
      const areaKeyId = regional[area]
      if (areaKeyId == null) continue
      const paths = areaKeyPaths[String(areaKeyId)]
      if (paths?.length) perArea[area] = paths
    }
    if (Object.keys(perArea).length) byItemId[String(row.id)] = perArea
  }
  return byItemId
}

async function main() {
  const areaSource = readFileSync(AREA_KEY_FILE, 'utf8')
  const funOpenSource = readFileSync(FUN_OPEN_FILE, 'utf8')

  const { areaKeyPaths, sMap } = parseAreaKeyGetPaths(areaSource)
  const funOpen = parseFunOpenResources(funOpenSource, sMap)
  const items = await loadItemGetPaths()
  const hiddenItemIds = loadHiddenItemIds()
  const byItemId = buildItemIndex(items, areaKeyPaths, hiddenItemIds)

  const payload = {
    generatedAt: new Date().toISOString(),
    defaultArea: 'China',
    areas: GAME_AREAS,
    byItemId,
    areaKeyPaths,
    funOpen,
  }

  writeFileSync(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(
    `[item-get-path] items=${Object.keys(byItemId).length} areaKeys=${Object.keys(areaKeyPaths).length} funOpen=${Object.keys(funOpen).length}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
