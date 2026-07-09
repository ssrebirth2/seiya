/**
 * Reverse index: item id → story/level sources (first clear, sweep, exchange unlock).
 *
 * Sources:
 * - LevelConfig.lua (first_award, sweep_award) — story chapters only (function_type 1/2/3)
 * - AwardConfig.lua (award contents)
 * - ExchangeConditionConfig.lua (fb_node unlock levels)
 * - ChapterConfig.lua + CommonBaseConfig chapter_award_list (chapter completion)
 * - StrongHoldChapterConfig.lua (level_progress_award milestones)
 *
 * Usage: node tools/build-item-stage-rewards-index.mjs
 * Output: public/data/item-stage-rewards-index.json
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const LUA_ROOT =
  process.env.LUA_CONFIG_ROOT ||
  'C:/rb2/backup/assets/resources/luascriptwithoutcodecomments/luaconfig'

const LEVEL_FILE = join(LUA_ROOT, 'game/level/LevelConfig.lua')
const AWARD_FILE = join(LUA_ROOT, 'game/award/AwardConfig.lua')
const EXCHANGE_CONDITION_FILE = join(LUA_ROOT, 'game/item/ExchangeConditionConfig.lua')
const CHAPTER_FILE = join(LUA_ROOT, 'game/level/ChapterConfig.lua')
const STRONGHOLD_CHAPTER_FILE = join(LUA_ROOT, 'game/level/StrongHoldChapterConfig.lua')
const STRONGHOLD_FILE = join(LUA_ROOT, 'game/scene/StrongHoldConfig.lua')
const COMMON_BASE_FILE = join(LUA_ROOT, 'game/common/CommonBaseConfig.lua')
const OUTPUT = join(ROOT, 'public/data/item-stage-rewards-index.json')
const HIDDEN_ITEM_IDS_TS = join(ROOT, 'src/lib/game/hidden-item-ids.ts')

const LEVEL_FIRST_AWARD_IDX = 13
const LEVEL_SWEEP_AWARD_IDX = 14
const LEVEL_FUNCTION_TYPE_IDX = 1

/** GameDefine.DuplicateType — only 1/2/3 are story chapter stages (normal/hard/nightmare). */
const STORY_CHAPTER_FUNCTION_TYPES = new Set([1, 2, 3])

function isStoryChapterLevel(functionType) {
  return functionType != null && STORY_CHAPTER_FUNCTION_TYPES.has(Number(functionType))
}

function mapFunctionTypeToDifficulty(functionType) {
  if (functionType === 1 || functionType === 2 || functionType === 3) return functionType
  return undefined
}
const PROP_TYPE = 'prop'

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

function parseSymbolTable(source) {
  const map = new Map()
  const m = source.match(/^local S=\{([^}]*)\}/m)
  if (!m) return map
  for (const part of m[1].matchAll(/(?:([nsb])_(\d+))=([^,}]+)/g)) {
    const [, kind, num, raw] = part
    const key = `${kind}_${num}`
    if (raw.startsWith('"')) map.set(key, raw.slice(1, -1))
    else if (raw === 'true') map.set(key, true)
    else if (raw === 'false') map.set(key, false)
    else if (/^-?\d+$/.test(raw)) map.set(key, Number(raw))
  }
  return map
}

function parseTemplateTable(source) {
  const map = new Map()
  const m = source.match(/local T=\{([\s\S]*?)\r?\n\}\r?\nreturn _G/s)
  if (!m) return map
  for (const tpl of m[1].matchAll(/(t_\d+)=\{([^\r\n]+)\}/g)) {
    const entries = []
    for (const chunk of tpl[2].matchAll(/\{([^\}]+)\}/g)) {
      entries.push(chunk[1].split(',').map((p) => p.trim()))
    }
    map.set(tpl[1], entries)
  }
  return map
}

function resolveToken(token, sMap, tMap) {
  const trimmed = String(token ?? '').trim()
  if (!trimmed || trimmed === 'nil') return null
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed)
  if (trimmed.startsWith('"')) return trimmed.slice(1, -1)
  const sRef = trimmed.match(/^S\.(b_\d+|n_\d+|s_\d+)$/)
  if (sRef) return sMap.get(sRef[1]) ?? null
  const tRef = trimmed.match(/^T\.(t_\d+)$/)
  if (tRef) {
    const tpl = tMap.get(tRef[1])
    return tpl ? tpl.map((entry) => parseAwardTuple(entry, sMap, tMap)).filter(Boolean) : null
  }
  return null
}

function parseAwardTuple(parts, sMap, tMap) {
  if (!Array.isArray(parts) || parts.length < 6) return null
  const type = resolveToken(parts[5], sMap, tMap)
  if (type !== PROP_TYPE) return null
  const sid = resolveToken(parts[3], sMap, tMap)
  const num = resolveToken(parts[1], sMap, tMap)
  if (sid == null || !Number.isFinite(Number(sid)) || Number(sid) <= 0) return null
  return {
    sid: Number(sid),
    qty: num != null && Number.isFinite(Number(num)) && Number(num) > 0 ? Number(num) : 1,
  }
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

function parseAwardConfig(source) {
  const sMap = parseSymbolTable(source)
  const tMap = parseTemplateTable(source)
  const byAwardId = new Map()

  for (const row of extractConfigRows(source)) {
    const fields = splitTopLevelFields(row.body)
    if (fields.length < 2) continue
    const awardField = fields[1]
    let items = []
    if (awardField.startsWith('T.')) {
      items = resolveToken(awardField, sMap, tMap) ?? []
    } else if (awardField.startsWith('{{')) {
      for (const chunk of awardField.matchAll(/\{([^\}]+)\}/g)) {
        const parts = chunk[1].split(',').map((p) => p.trim())
        const parsed = parseAwardTuple(parts, sMap, tMap)
        if (parsed) items.push(parsed)
      }
    }
    if (items.length) byAwardId.set(row.id, items)
  }

  return byAwardId
}

function parseLevelConfig(source) {
  const sMap = parseSymbolTable(source)
  const levels = []

  for (const row of extractConfigRows(source)) {
    const fields = splitTopLevelFields(row.body)
    if (fields.length <= LEVEL_SWEEP_AWARD_IDX) continue

    const firstAward = resolveToken(fields[LEVEL_FIRST_AWARD_IDX], sMap, new Map())
    const sweepAward = resolveToken(fields[LEVEL_SWEEP_AWARD_IDX], sMap, new Map())
    const chapter = resolveToken(fields[2], sMap, new Map())
    const functionType = resolveToken(fields[LEVEL_FUNCTION_TYPE_IDX], sMap, new Map())
    const levelSerial = resolveToken(fields[6], sMap, new Map())

    // natural_trial (5), magic_tower (6), etc. reuse chapter/serial fields but are not story stages.
    if (!isStoryChapterLevel(functionType)) continue

    if (firstAward == null && sweepAward == null) continue

    levels.push({
      id: row.id,
      chapter: chapter != null ? Number(chapter) : null,
      levelType: mapFunctionTypeToDifficulty(
        functionType != null ? Number(functionType) : null
      ),
      levelSerial: levelSerial != null ? Number(levelSerial) : null,
      firstAward: firstAward != null ? Number(firstAward) : null,
      sweepAward: sweepAward != null ? Number(sweepAward) : null,
    })
  }

  return levels
}

function parseExchangeConditionConfig(source) {
  const sMap = parseSymbolTable(source)
  const byItemId = new Map()

  for (const row of extractConfigRows(source)) {
    const fields = splitTopLevelFields(row.body)
    if (fields.length < 2) continue
    const unlockField = fields[1]
    if (!unlockField.startsWith('{{')) continue

    for (const chunk of unlockField.matchAll(/\{([^\}]+)\}/g)) {
      const parts = chunk[1].split(',').map((p) => p.trim())
      if (parts.length < 4) continue
      const type = resolveToken(parts[2], sMap, new Map())
      const levelId = resolveToken(parts[3], sMap, new Map())
      if (type !== 'fb_node' || levelId == null) continue
      byItemId.set(row.id, Number(levelId))
      break
    }
  }

  return byItemId
}

function entryDedupeKey(entry) {
  if (entry.kind === 'first_clear' || entry.kind === 'sweep' || entry.kind === 'exchange_unlock') {
    return `${entry.kind}:${entry.levelId}`
  }
  if (entry.kind === 'chapter_award') {
    return `${entry.kind}:${entry.chapterId}:${entry.chapterMode ?? 'normal'}`
  }
  if (entry.kind === 'chapter_progress') {
    return `${entry.kind}:${entry.strongholdChapterId}:${entry.progress}`
  }
  return JSON.stringify(entry)
}

function entrySortKey(entry) {
  if (entry.kind === 'first_clear' || entry.kind === 'sweep' || entry.kind === 'exchange_unlock') {
    const kindOrder =
      entry.kind === 'first_clear' ? 0 : entry.kind === 'sweep' ? 1 : 2
    return [kindOrder, entry.levelId ?? 0, entry.kind]
  }
  if (entry.kind === 'chapter_award') {
    return [1, entry.chapterId ?? 0, entry.chapterMode ?? '']
  }
  if (entry.kind === 'chapter_progress') {
    return [2, entry.strongholdChapterId ?? 0, entry.progress ?? 0]
  }
  return [9, 0, entry.kind]
}

/**
 * Spirit promotion soul stones (10061–10079) are granted automatically in-game.
 * LevelConfig reuses first_award ids here but they are not farmable stage sources.
 * Progress soul stones (e.g. 10153) use different ids and StrongHoldChapter milestones.
 */
const AUTO_SPIRIT_SOUL_STONE_MIN = 10061
const AUTO_SPIRIT_SOUL_STONE_MAX = 10079

function isAutoSpiritSoulStone(itemId) {
  return itemId >= AUTO_SPIRIT_SOUL_STONE_MIN && itemId <= AUTO_SPIRIT_SOUL_STONE_MAX
}

function pushEntry(map, itemId, entry) {
  if (isAutoSpiritSoulStone(itemId)) return
  const key = String(itemId)
  if (!map.has(key)) map.set(key, [])
  const list = map.get(key)
  const dedupeKey = entryDedupeKey(entry)
  const existing = list.find((e) => entryDedupeKey(e) === dedupeKey)
  if (existing) {
    if (entry.qty != null && (existing.qty ?? 0) < entry.qty) existing.qty = entry.qty
    return
  }
  list.push(entry)
}

function parseCommonBaseList(source, listKey) {
  const sMap = parseSymbolTable(source)
  const match = source.match(
    new RegExp(`\\["${listKey}"\\]=\\{[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,\\{([^}]*)\\}`)
  )
  if (!match) return []
  return match[1]
    .split(',')
    .map((token) => resolveToken(token.trim(), sMap, new Map()))
    .filter((id) => id != null)
    .map(Number)
}

function parseChapterAwards(source, { listKey, chapterMode, awardById, hiddenItemIds }) {
  const commonSource = readFileSync(COMMON_BASE_FILE, 'utf8')
  const chapterIds = parseCommonBaseList(commonSource, listKey)
  const sMap = parseSymbolTable(source)
  const awards = []

  for (const row of extractConfigRows(source)) {
    if (!chapterIds.includes(row.id)) continue
    const fields = splitTopLevelFields(row.body)
    if (fields.length < 6) continue

    const chapterNameKey = fields[1]?.startsWith('"') ? fields[1].slice(1, -1) : null
    const awardId = resolveToken(fields[5], sMap, new Map())
    if (awardId == null || awardId <= 0) continue

    awards.push({
      chapterId: row.id,
      chapterMode,
      chapterNameKey,
      awardId: Number(awardId),
    })
  }

  return { chapterIds: chapterIds.length, awards }
}

function parseStrongHoldChapterSegments(fields, sMap) {
  const chapterField = fields[1]
  if (!chapterField?.startsWith('{{')) return []
  const inner = chapterField.startsWith('{{') ? chapterField.slice(1, -1) : chapterField
  const segments = []
  for (const chunk of inner.matchAll(/\{([^\}]+)\}/g)) {
    const parts = chunk[1].split(',').map((p) => p.trim())
    if (parts.length < 2) continue
    const id = resolveToken(parts[0], sMap, new Map())
    const num = resolveToken(parts[1], sMap, new Map())
    if (id != null && num != null) {
      segments.push({ id: Number(id), num: Number(num) })
    }
  }
  return segments
}

function resolveProgressChapterId(segments, progress) {
  for (const seg of segments) {
    if (progress <= seg.num) return seg.id
  }
  return segments.length ? segments[segments.length - 1].id : null
}

function parseFlatNumberList(field, sMap) {
  if (!field?.startsWith('{')) return []
  const inner = field.slice(1, -1).trim()
  if (!inner) return []
  return inner
    .split(',')
    .map((token) => resolveToken(token.trim(), sMap, new Map()))
    .filter((value) => value != null)
    .map(Number)
}

function parseStrongHoldChapterDifficultyMap(source) {
  const sMap = parseSymbolTable(source)
  const difficultyByShChapterId = new Map()

  for (const row of extractConfigRows(source)) {
    const fields = splitTopLevelFields(row.body)
    const chapterField = fields[16]
    const ids = parseFlatNumberList(chapterField, sMap)
    for (let i = 0; i < Math.min(3, ids.length); i++) {
      const shChapterId = ids[i]
      if (shChapterId > 0) {
        difficultyByShChapterId.set(shChapterId, i + 1)
      }
    }
  }

  return difficultyByShChapterId
}

function parseStrongHoldProgressAwards(source, { awardById, hiddenItemIds, difficultyByShChapterId }) {
  const sMap = parseSymbolTable(source)
  const milestones = []

  for (const row of extractConfigRows(source)) {
    const fields = splitTopLevelFields(row.body)
    if (fields.length < 3) continue
    const chapterSegments = parseStrongHoldChapterSegments(fields, sMap)
    const progressField = fields[2]
    if (!progressField.startsWith('{{')) continue

    for (const chunk of progressField.matchAll(/\{([^\}]+)\}/g)) {
      const parts = chunk[1].split(',').map((p) => p.trim())
      if (parts.length < 2) continue
      const awardId = resolveToken(parts[0], sMap, new Map())
      const progress = resolveToken(parts[1], sMap, new Map())
      if (awardId == null || progress == null) continue

      const progressNum = Number(progress)
      const progressChapterId = resolveProgressChapterId(chapterSegments, progressNum)

      milestones.push({
        strongholdChapterId: row.id,
        progress: progressNum,
        progressChapterId: progressChapterId ?? undefined,
        awardId: Number(awardId),
        levelType: difficultyByShChapterId.get(row.id),
      })
    }
  }

  return milestones
}

function resolveFirstClearAwardItems(firstAwardId, awardById) {
  if (firstAwardId == null || firstAwardId <= 0) return []
  return awardById.get(firstAwardId) ?? []
}

function resolveSweepAwardItems(_firstAwardId, sweepAwardId, awardById) {
  if (sweepAwardId == null || sweepAwardId <= 0) return []
  return awardById.get(sweepAwardId) ?? []
}

function buildIndex({
  awardById,
  levels,
  exchangeByItemId,
  chapterAwards,
  progressMilestones,
  hiddenItemIds,
}) {
  const byItemId = new Map()

  for (const level of levels) {
    const base = {
      levelId: level.id,
      chapter: level.chapter ?? undefined,
      levelSerial: level.levelSerial ?? undefined,
      levelType: level.levelType ?? undefined,
    }

    if (level.firstAward != null && level.firstAward > 0) {
      for (const item of resolveFirstClearAwardItems(level.firstAward, awardById)) {
        if (hiddenItemIds.has(item.sid)) continue
        pushEntry(byItemId, item.sid, { ...base, kind: 'first_clear', qty: item.qty })
      }
    }

    if (level.sweepAward != null && level.sweepAward > 0) {
      for (const item of resolveSweepAwardItems(
        level.firstAward,
        level.sweepAward,
        awardById
      )) {
        if (hiddenItemIds.has(item.sid)) continue
        pushEntry(byItemId, item.sid, { ...base, kind: 'sweep', qty: item.qty })
      }
    }
  }

  for (const chapter of chapterAwards) {
    for (const item of awardById.get(chapter.awardId) ?? []) {
      if (hiddenItemIds.has(item.sid)) continue
      pushEntry(byItemId, item.sid, {
        kind: 'chapter_award',
        chapterId: chapter.chapterId,
        chapterMode: chapter.chapterMode,
        chapterNameKey: chapter.chapterNameKey ?? undefined,
        qty: item.qty,
      })
    }
  }

  for (const milestone of progressMilestones) {
    for (const item of awardById.get(milestone.awardId) ?? []) {
      if (hiddenItemIds.has(item.sid)) continue
      pushEntry(byItemId, item.sid, {
        kind: 'chapter_progress',
        strongholdChapterId: milestone.strongholdChapterId,
        progressChapterId: milestone.progressChapterId,
        progress: milestone.progress,
        levelType: milestone.levelType,
        qty: item.qty,
      })
    }
  }

  for (const [itemId, levelId] of exchangeByItemId.entries()) {
    if (hiddenItemIds.has(itemId)) continue
    pushEntry(byItemId, itemId, { levelId, kind: 'exchange_unlock' })
  }

  for (const entries of byItemId.values()) {
    entries.sort((a, b) => {
      const ka = entrySortKey(a)
      const kb = entrySortKey(b)
      for (let i = 0; i < ka.length; i++) {
        if (ka[i] < kb[i]) return -1
        if (ka[i] > kb[i]) return 1
      }
      return 0
    })
  }

  return Object.fromEntries(
    [...byItemId.entries()].sort(([a], [b]) => Number(a) - Number(b))
  )
}

function main() {
  const levelSource = readFileSync(LEVEL_FILE, 'utf8')
  const awardSource = readFileSync(AWARD_FILE, 'utf8')
  const exchangeSource = readFileSync(EXCHANGE_CONDITION_FILE, 'utf8')
  const chapterSource = readFileSync(CHAPTER_FILE, 'utf8')
  const strongHoldChapterSource = readFileSync(STRONGHOLD_CHAPTER_FILE, 'utf8')
  const strongHoldSource = readFileSync(STRONGHOLD_FILE, 'utf8')
  const hiddenItemIds = loadHiddenItemIds()

  const awardById = parseAwardConfig(awardSource)
  const levels = parseLevelConfig(levelSource)
  const exchangeByItemId = parseExchangeConditionConfig(exchangeSource)
  const difficultyByShChapterId = parseStrongHoldChapterDifficultyMap(strongHoldSource)

  const normalChapters = parseChapterAwards(chapterSource, {
    listKey: 'chapter_award_list',
    chapterMode: 'normal',
    awardById,
    hiddenItemIds,
  })
  const hardChapters = parseChapterAwards(chapterSource, {
    listKey: 'chapter_hard_award_list',
    chapterMode: 'hard',
    awardById,
    hiddenItemIds,
  })
  const nightmareChapters = parseChapterAwards(chapterSource, {
    listKey: 'chapter_nightmare_award_list',
    chapterMode: 'nightmare',
    awardById,
    hiddenItemIds,
  })
  const chapterAwards = [
    ...normalChapters.awards,
    ...hardChapters.awards,
    ...nightmareChapters.awards,
  ]
  const progressMilestones = parseStrongHoldProgressAwards(strongHoldChapterSource, {
    awardById,
    hiddenItemIds,
    difficultyByShChapterId,
  })

  const byItemId = buildIndex({
    awardById,
    levels,
    exchangeByItemId,
    chapterAwards,
    progressMilestones,
    hiddenItemIds,
  })

  const payload = {
    generatedAt: new Date().toISOString(),
    byItemId,
  }

  writeFileSync(OUTPUT, `${JSON.stringify(payload)}\n`, 'utf8')
  console.log(
    `[item-stage-rewards] items=${Object.keys(byItemId).length} levels=${levels.length} awards=${awardById.size} exchange=${exchangeByItemId.size} chapter_awards=${chapterAwards.length} progress_milestones=${progressMilestones.length}`
  )
}

main()
