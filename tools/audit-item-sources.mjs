/**
 * Audit listed items for missing obtain sources and empty detail pages.
 *
 * Uses committed JSON indexes + Lua ItemConfig (no Supabase required).
 *
 * Usage: node tools/audit-item-sources.mjs
 * Output: public/data/audit-item-sources.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const LUA_ROOT =
  process.env.LUA_CONFIG_ROOT ||
  'C:/rb2/backup/assets/resources/luascriptwithoutcodecomments/luaconfig'

const HIDDEN_ITEM_IDS_TS = join(ROOT, 'src/lib/game/hidden-item-ids.ts')
const ITEM_FILE = join(LUA_ROOT, 'game/item/ItemConfig.lua')
const COMPOSITE_FILE = join(LUA_ROOT, 'game/item/CompositeConfig.lua')
const EXCHANGE_FILE = join(LUA_ROOT, 'game/item/ExchangeConfig.lua')
const BOX_SHOW_FILE = join(LUA_ROOT, 'game/item/BoxAwardShowConfig.lua')
const BOX_CONSUME_FILE = join(LUA_ROOT, 'game/item/BoxAwardConsumeConfig.lua')

const GET_PATH_INDEX = join(ROOT, 'public/data/item-get-path-index.json')
const STAGE_INDEX = join(ROOT, 'public/data/item-stage-rewards-index.json')
const USAGE_INDEX = join(ROOT, 'public/data/item-usage-index.json')
const OUTPUT = join(ROOT, 'public/data/audit-item-sources.json')

const OBTAIN_ROLES = new Set(['exchange_get', 'box_contains'])

function loadHiddenItemIds() {
  const text = readFileSync(HIDDEN_ITEM_IDS_TS, 'utf8')
  const match = text.match(/export const HIDDEN_ITEM_IDS[^[]*\[([^\]]*)\]/)
  if (!match) return new Set()
  return new Set([...match[1].matchAll(/\d+/g)].map((m) => Number(m[0])))
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
    rows.push({ id, body: source.slice(start, i - 1) })
  }
  return rows
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

function parseItemCatalog(source, hiddenItemIds) {
  const items = new Map()
  for (const row of extractConfigRows(source)) {
    if (hiddenItemIds.has(row.id)) continue
    const fields = splitTopLevelFields(row.body)
    const nameKey = fields[4]?.startsWith('"') ? fields[4].slice(1, -1) : null
    const composeRaw = fields[8]?.trim()
    const compose =
      composeRaw && composeRaw !== 'nil' && /^-?\d+$/.test(composeRaw) ? Number(composeRaw) : null
    items.set(row.id, { id: row.id, nameKey, compose })
  }
  return items
}

function loadJson(path, label) {
  if (!existsSync(path)) {
    console.warn(`[audit] missing ${label}: ${path}`)
    return null
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

function hasExchangeOnItem(source, itemId) {
  const row = extractConfigRows(source).find((r) => r.id === itemId)
  if (!row) return false
  const fields = splitTopLevelFields(row.body)
  for (const field of fields.slice(1, 4)) {
    const t = field.trim()
    if (t !== 'nil' && t !== '0' && t !== 'S.n_1') return true
  }
  return false
}

function hasCompositeRecipe(source, itemId) {
  return extractConfigRows(source).some((r) => r.id === itemId)
}

function hasBoxConfig(source, itemId) {
  return extractConfigRows(source).some((r) => r.id === itemId)
}

function buildUsageMaps(usageRows, hiddenItemIds) {
  const byItemId = new Map()
  const craftOutputIds = new Set()
  const usageCountByItem = new Map()

  for (const row of usageRows) {
    const itemId = Number(row.item_id)
    if (!Number.isFinite(itemId) || hiddenItemIds.has(itemId)) continue

    if (!byItemId.has(itemId)) byItemId.set(itemId, [])
    byItemId.get(itemId).push(row)

    usageCountByItem.set(itemId, (usageCountByItem.get(itemId) ?? 0) + 1)

    if (row.role === 'craft_ingredient' && row.meta?.craft_target_id) {
      const targetId = Number(row.meta.craft_target_id)
      if (Number.isFinite(targetId) && !hiddenItemIds.has(targetId)) {
        craftOutputIds.add(targetId)
      }
    }
  }

  return { byItemId, craftOutputIds, usageCountByItem }
}

function summarizeStageLines(lines) {
  if (!lines?.length) return null
  const kinds = [...new Set(lines.map((l) => l.kind))].sort()
  return { count: lines.length, kinds }
}

function classifyItem(id, ctx) {
  const {
    getPath,
    stage,
    usageRows,
    craftOutputIds,
    itemMeta,
    exchangeSource,
    compositeSource,
    boxShowSource,
    boxConsumeSource,
  } = ctx

  const obtain = {
    getPath: getPath != null,
    stageRewards: (stage?.count ?? 0) > 0,
    rewardSources:
      usageRows?.some((r) => OBTAIN_ROLES.has(r.role) && isListedSource(r, ctx.hiddenItemIds)) ??
      false,
  }

  const content = {
    ...obtain,
    craftRecipe: craftOutputIds.has(id) || compositeSource,
    exchangeOnItem: exchangeSource,
    boxShow: boxShowSource,
    boxConsume: boxConsumeSource,
    usageRows: (usageRows?.length ?? 0) > 0,
    composeField: itemMeta.compose != null && itemMeta.compose > 0,
  }

  const hasObtain = obtain.getPath || obtain.stageRewards || obtain.rewardSources
  const hasDetail =
    hasObtain ||
    content.craftRecipe ||
    content.exchangeOnItem ||
    content.boxShow ||
    content.boxConsume ||
    content.usageRows ||
    content.composeField

  const gaps = []
  if (!obtain.getPath) gaps.push('no_get_path')
  if (!obtain.stageRewards) gaps.push('no_stage_rewards')
  if (!obtain.rewardSources) gaps.push('no_reward_sources')
  if (!hasObtain) gaps.push('no_obtain_source')
  if (!hasDetail) gaps.push('empty_detail_page')

  return { obtain, content, hasObtain, hasDetail, gaps }
}

function isListedSource(row, hiddenItemIds) {
  const meta = row.meta ?? {}
  const hostId = meta.host_item_id ?? meta.box_item_id
  if (hostId != null) {
    const n = Number(hostId)
    if (Number.isFinite(n) && hiddenItemIds.has(n)) return false
  }
  return true
}

function main() {
  const hiddenItemIds = loadHiddenItemIds()
  const itemSource = readFileSync(ITEM_FILE, 'utf8')
  const catalog = parseItemCatalog(itemSource, hiddenItemIds)

  const getPathIndex = loadJson(GET_PATH_INDEX, 'get-path index')
  const stageIndex = loadJson(STAGE_INDEX, 'stage-rewards index')
  const usageIndex = loadJson(USAGE_INDEX, 'usage index')
  const usageRows = usageIndex ?? []
  const { byItemId: usageByItem, craftOutputIds } = buildUsageMaps(usageRows, hiddenItemIds)

  const exchangeSource = existsSync(EXCHANGE_FILE) ? readFileSync(EXCHANGE_FILE, 'utf8') : ''
  const compositeSource = existsSync(COMPOSITE_FILE) ? readFileSync(COMPOSITE_FILE, 'utf8') : ''
  const boxShowSource = existsSync(BOX_SHOW_FILE) ? readFileSync(BOX_SHOW_FILE, 'utf8') : ''
  const boxConsumeSource = existsSync(BOX_CONSUME_FILE) ? readFileSync(BOX_CONSUME_FILE, 'utf8') : ''

  const emptyObtain = []
  const emptyDetail = []
  const gapCounts = {}
  const soulStoneRange = []

  for (const [id, meta] of catalog) {
    const ctx = {
      hiddenItemIds,
      getPath: getPathIndex?.byItemId?.[String(id)],
      stage: summarizeStageLines(stageIndex?.byItemId?.[String(id)]),
      usageRows: usageByItem.get(id) ?? [],
      craftOutputIds,
      itemMeta: meta,
      exchangeSource: exchangeSource ? hasExchangeOnItem(exchangeSource, id) : false,
      compositeSource: compositeSource ? hasCompositeRecipe(compositeSource, id) : false,
      boxShowSource: boxShowSource ? hasBoxConfig(boxShowSource, id) : false,
      boxConsumeSource: boxConsumeSource ? hasBoxConfig(boxConsumeSource, id) : false,
    }

    const result = classifyItem(id, ctx)
    for (const gap of result.gaps) {
      gapCounts[gap] = (gapCounts[gap] ?? 0) + 1
    }

    if (id >= 10070 && id <= 10079) {
      soulStoneRange.push({
        id,
        nameKey: meta.nameKey,
        hasObtain: result.hasObtain,
        hasDetail: result.hasDetail,
        stage: ctx.stage,
        getPath: result.obtain.getPath,
      })
    }

    if (!result.hasObtain) {
      emptyObtain.push({
        id,
        nameKey: meta.nameKey,
        obtain: result.obtain,
        content: {
          craftRecipe: result.content.craftRecipe,
          exchangeOnItem: result.content.exchangeOnItem,
          boxShow: result.content.boxShow,
          boxConsume: result.content.boxConsume,
          usageRows: result.content.usageRows,
        },
        gaps: result.gaps.filter((g) => g.startsWith('no_')),
      })
    }

    if (!result.hasDetail) {
      emptyDetail.push({ id, nameKey: meta.nameKey, gaps: result.gaps })
    }
  }

  emptyObtain.sort((a, b) => a.id - b.id)
  emptyDetail.sort((a, b) => a.id - b.id)

  const payload = {
    generatedAt: new Date().toISOString(),
    summary: {
      listedItems: catalog.size,
      withGetPath: catalog.size - (gapCounts.no_get_path ?? 0),
      withStageRewards: catalog.size - (gapCounts.no_stage_rewards ?? 0),
      withRewardSources: catalog.size - (gapCounts.no_reward_sources ?? 0),
      withAnyObtain: catalog.size - (gapCounts.no_obtain_source ?? 0),
      emptyObtain: emptyObtain.length,
      emptyDetail: emptyDetail.length,
      gapCounts,
    },
    soulStoneRange,
    emptyObtain,
    emptyDetail,
  }

  writeFileSync(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  console.log(`[audit-item-sources] listed=${catalog.size}`)
  console.log(`  obtain: get_path=${payload.summary.withGetPath} stage=${payload.summary.withStageRewards} reward=${payload.summary.withRewardSources}`)
  console.log(`  empty obtain=${emptyObtain.length} empty detail=${emptyDetail.length}`)
  console.log(`  → ${OUTPUT}`)

  if (emptyObtain.length > 0) {
    console.log('\nFirst 20 items without any obtain source:')
    for (const row of emptyObtain.slice(0, 20)) {
      console.log(`  ${row.id} ${row.nameKey ?? ''} usage=${row.content.usageRows}`)
    }
    if (emptyObtain.length > 20) {
      console.log(`  … +${emptyObtain.length - 20} more (see JSON)`)
    }
  }
}

main()
