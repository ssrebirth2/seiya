import {
  getNoDataLabel,
  isMissingLcTranslation,
  translateKeys,
} from '@/lib/i18n/language-package'
import { collectGetPathCoveredLevelTypes } from '@/lib/game/item-get-path'
import { resolveExchangeUnlockLine } from '@/lib/game/exchange-unlock'
import { getLevelIndexCode } from '@/lib/game/get-level-index-code'
import { resolveGameLevelDisplayName } from '@/lib/game/get-level-display-name'

export type ItemStageRewardKind =
  | 'first_clear'
  | 'sweep'
  | 'exchange_unlock'
  | 'chapter_award'
  | 'chapter_progress'

export type ChapterMode = 'normal' | 'hard' | 'nightmare'

export type LevelType = 1 | 2 | 3

export type ItemStageRewardEntry = {
  levelId?: number
  kind: ItemStageRewardKind
  qty?: number
  /** LevelConfig.chapter (internal chapter id). */
  chapter?: number
  /**
   * ChapterConfig.show_id — player-facing chapter number in stage codes
   * (GameUtil.GetLevelIndexName). Falls back to `chapter` when absent.
   */
  showId?: number
  levelSerial?: number
  /** Chapter difficulty tab — from LevelConfig.function_type (1 story, 2 elite, 3 nightmare). */
  levelType?: LevelType
  /** ChapterConfig.chapter_name LC key. */
  chapterNameKey?: string
  /**
   * NpcRoster.level_name LC key — used for normal_level (story) via
   * GameUtil.GetLevelNameByLevelConfig.
   */
  levelNameKey?: string
  chapterId?: number
  progressChapterId?: number
  chapterMode?: ChapterMode
  strongholdChapterId?: number
  progress?: number
}

export type ItemStageRewardLine = {
  id: string
  kind: ItemStageRewardKind | 'stage_merged'
  chapter?: string
  stage?: string
  condition?: string
  qty?: number
  firstClearQty?: number
  stageDropQty?: number
  hasFirstClear?: boolean
  hasStageDrop?: boolean
  /** LevelConfig id — primary sort key for stage rows. */
  levelId?: number
  /** Resolved label from LC_Chpter_level_type{1|2|3}. */
  difficulty?: string
  levelType?: LevelType
  chapterId?: number
  progress?: number
  /** Fallback plain text (e.g. exchange unlock). */
  line?: string
}

type StageRewardsIndex = {
  byItemId: Record<string, ItemStageRewardEntry[]>
}

const STAGE_REWARD_KIND_LABEL_KEYS: Partial<Record<ItemStageRewardKind, string>> = {
  first_clear: 'LC_COMMON_normal_reward',
  sweep: 'LC_COMMON_sweep',
  exchange_unlock: 'LC_UNLOCK_exchange_fb_node',
  chapter_award: 'LC_COMMON_chapter_reward',
}

const LEVEL_TYPE_LC_KEYS: Record<LevelType, string> = {
  1: 'LC_Chpter_level_type1',
  2: 'LC_Chpter_level_type2',
  3: 'LC_Chpter_level_type3',
}

const CHAPTER_MODE_TO_LEVEL_TYPE: Record<ChapterMode, LevelType> = {
  normal: 1,
  hard: 2,
  nightmare: 3,
}

let indexCache: StageRewardsIndex | null = null
let indexPromise: Promise<StageRewardsIndex> | null = null

async function loadStageRewardsIndex(): Promise<StageRewardsIndex> {
  if (indexCache) return indexCache
  if (indexPromise) return indexPromise

  indexPromise = (async () => {
    try {
      const res = await fetch('/data/item-stage-rewards-index.json')
      if (!res.ok) {
        indexCache = { byItemId: {} }
        return indexCache
      }
      indexCache = (await res.json()) as StageRewardsIndex
      return indexCache
    } catch {
      indexCache = { byItemId: {} }
      return indexCache
    } finally {
      indexPromise = null
    }
  })()

  return indexPromise
}

function isNoDataTranslation(
  key: string,
  value: string | undefined,
  lang: string
): boolean {
  if (!value?.trim()) return true
  if (isMissingLcTranslation(key, value)) return true
  const noData = getNoDataLabel(lang)
  return value === noData
}

function resolveLevelLabel(
  entry: ItemStageRewardEntry,
  translations: Record<string, string>,
  lang: string
): string {
  const indexCode = getLevelIndexCode(
    entry.showId ?? entry.chapter,
    entry.levelSerial
  )
  if (indexCode) return indexCode

  const nameKey = `LC_LEVEL_name_${entry.levelId}`
  const name = translations[nameKey]
  if (name && !isNoDataTranslation(nameKey, name, lang)) {
    return name
  }

  if (entry.levelId != null) return `#${entry.levelId}`
  return ''
}

function resolveLevelTypeLabel(
  levelType: number | undefined,
  translations: Record<string, string>,
  lang: string
): string | undefined {
  if (levelType == null || !(levelType in LEVEL_TYPE_LC_KEYS)) return undefined
  const key = LEVEL_TYPE_LC_KEYS[levelType as LevelType]
  if (!key) return undefined
  const label = translations[key]
  if (!label || isNoDataTranslation(key, label, lang)) return undefined
  return label
}

function resolveChapterNameKey(entry: ItemStageRewardEntry): string | null {
  if (entry.chapterNameKey) return entry.chapterNameKey
  const chapterRef = entry.chapterId ?? entry.progressChapterId ?? entry.chapter
  if (chapterRef != null) return `LC_Level_chapter_name_${chapterRef}`
  return null
}

/** Chapter completion / progress rows — chapter LC only (not a per-level name). */
function resolveChapterLabel(
  entry: ItemStageRewardEntry,
  translations: Record<string, string>,
  lang: string
): string {
  const nameKey = resolveChapterNameKey(entry)
  if (nameKey) {
    const name = translations[nameKey]
    if (name && !isNoDataTranslation(nameKey, name, lang)) {
      return name
    }
  }
  const chapterRef = entry.chapterId ?? entry.progressChapterId ?? entry.chapter
  if (chapterRef != null) return `#${chapterRef}`
  return ''
}

/**
 * Stage drop name — mirrors GameUtil.GetLevelNameByLevelConfig
 * (BigLevelItemView LevelNameLabel).
 */
function resolveStageLevelName(
  entry: ItemStageRewardEntry,
  translations: Record<string, string>,
  lang: string
): string {
  return resolveGameLevelDisplayName(
    {
      levelType: entry.levelType,
      levelNameKey: entry.levelNameKey,
      chapterNameKey: resolveChapterNameKey(entry) ?? undefined,
    },
    translations,
    (key, value) => Boolean(value && !isNoDataTranslation(key, value, lang))
  )
}

function formatProgressTemplate(
  template: string,
  progress: number | undefined
): string {
  const value = String(progress ?? '')
  return template.replace(/\{0\}/g, value).replace(/%s/g, value)
}

function stripTrailingRewardPrompt(text: string): string {
  return text
    .replace(
      /\s*(to get|para obter|para receber|você poderá receber|voce podera receber|menerima|obtener|obtenir)\s*:?\s*$/i,
      ''
    )
    .replace(/[：:]\s*$/, '')
    .trim()
}

function formatProgressCondition(
  template: string,
  progress: number | undefined
): string {
  return stripTrailingRewardPrompt(formatProgressTemplate(template, progress))
}

function isValidStageRewardLine(row: ItemStageRewardLine, noDataLabel: string): boolean {
  if (row.line) {
    return (
      row.line.length > 0 &&
      !row.line.includes(noDataLabel) &&
      !row.line.includes('LC_')
    )
  }
  if (row.kind === 'stage_merged') {
    if (!row.chapter?.trim() || !row.stage?.trim()) return false
    if (!row.hasFirstClear && !row.hasStageDrop) return false
    const blob = [row.chapter, row.stage].join(' ')
    return !blob.includes(noDataLabel) && !blob.includes('LC_')
  }
  if (!row.chapter?.trim()) return false
  const blob = [row.chapter, row.stage, row.condition].filter(Boolean).join(' ')
  return blob.length > 0 && !blob.includes(noDataLabel) && !blob.includes('LC_')
}

function mergeStageRewardLines(lines: ItemStageRewardLine[]): ItemStageRewardLine[] {
  const merged: ItemStageRewardLine[] = []
  const byStage = new Map<string, ItemStageRewardLine>()

  for (const row of lines) {
    if (row.line || row.kind === 'chapter_award' || row.kind === 'chapter_progress') {
      merged.push(row)
      continue
    }

    if (row.kind !== 'first_clear' && row.kind !== 'sweep') {
      merged.push(row)
      continue
    }

    const key = `${row.chapter ?? ''}\0${row.stage ?? ''}`
    let existing = byStage.get(key)
    if (!existing) {
      existing = {
        id: `stage_merged:${row.levelId ?? key}`,
        kind: 'stage_merged',
        chapter: row.chapter,
        stage: row.stage,
        levelId: row.levelId,
        levelType: row.levelType,
        difficulty: row.difficulty,
        hasFirstClear: row.kind === 'first_clear',
        hasStageDrop: row.kind === 'sweep',
        firstClearQty: row.kind === 'first_clear' ? row.qty : undefined,
        stageDropQty: row.kind === 'sweep' ? row.qty : undefined,
      }
      byStage.set(key, existing)
      continue
    }

    if (row.kind === 'first_clear') {
      existing.hasFirstClear = true
      existing.firstClearQty = row.qty
    }
    if (row.kind === 'sweep') {
      existing.hasStageDrop = true
      existing.stageDropQty = row.qty
    }
  }

  return [...byStage.values(), ...merged]
}

function compareStageRewardLines(a: ItemStageRewardLine, b: ItemStageRewardLine): number {
  const kindRank = (kind: ItemStageRewardLine['kind']) => {
    if (kind === 'stage_merged' || kind === 'first_clear' || kind === 'sweep') return 0
    if (kind === 'chapter_award') return 1
    if (kind === 'chapter_progress') return 2
    return 3
  }
  const rankDiff = kindRank(a.kind) - kindRank(b.kind)
  if (rankDiff !== 0) return rankDiff

  // Story → Elite → Nightmare, then player-facing show_id-serial, then levelId.
  if (a.levelType != null && b.levelType != null) {
    const typeDiff = a.levelType - b.levelType
    if (typeDiff !== 0) return typeDiff
  }

  const aHasStage = /^\d+-\d+$/.test(a.stage ?? '')
  const bHasStage = /^\d+-\d+$/.test(b.stage ?? '')
  if (aHasStage && bHasStage) {
    const [aShow, aSerial] = (a.stage as string).split('-').map(Number)
    const [bShow, bSerial] = (b.stage as string).split('-').map(Number)
    if (aShow !== bShow) return aShow - bShow
    if (aSerial !== bSerial) return aSerial - bSerial
  }

  if (a.chapterId != null && b.chapterId != null) {
    const chapterDiff = a.chapterId - b.chapterId
    if (chapterDiff !== 0) return chapterDiff
  }

  if (a.progress != null && b.progress != null) {
    const progressDiff = a.progress - b.progress
    if (progressDiff !== 0) return progressDiff
  }

  if (a.levelId != null && b.levelId != null) return a.levelId - b.levelId
  if (a.levelId != null) return -1
  if (b.levelId != null) return 1

  return 0
}

function buildStageRewardLine(
  entry: ItemStageRewardEntry,
  translations: Record<string, string>,
  lang: string
): ItemStageRewardLine | null {
  const idParts = [
    entry.kind,
    entry.chapterId ?? entry.strongholdChapterId ?? entry.levelId ?? entry.progress,
  ]
  const base = { kind: entry.kind, qty: entry.qty }

  if (entry.kind === 'exchange_unlock' && entry.levelId != null) {
    const line = resolveExchangeUnlockLine(
      { desc: 'LC_UNLOCK_exchange_fb_node', type: 'fb_node', value: entry.levelId },
      translations
    )
    if (!line) return null
    return { ...base, id: `${idParts.join(':')}:${entry.levelId}`, line }
  }

  if (entry.kind === 'first_clear' && entry.levelId != null) {
    const chapter = resolveStageLevelName(entry, translations, lang)
    const stage = resolveLevelLabel(entry, translations, lang)
    if (!chapter || !stage) return null
    const levelType = entry.levelType
    const difficulty = resolveLevelTypeLabel(levelType, translations, lang)

    return {
      ...base,
      id: `first_clear:${entry.levelId}`,
      chapter,
      stage,
      levelId: entry.levelId,
      levelType,
      difficulty,
    }
  }

  if (entry.kind === 'chapter_award') {
    const chapter = resolveChapterLabel(entry, translations, lang)
    if (!chapter) return null

    const levelType =
      entry.chapterMode != null ? CHAPTER_MODE_TO_LEVEL_TYPE[entry.chapterMode] : undefined
    const difficulty = resolveLevelTypeLabel(levelType, translations, lang)

    return {
      ...base,
      id: `${idParts.join(':')}:${entry.chapterId ?? entry.chapterMode ?? 0}`,
      chapter,
      chapterId: entry.chapterId,
      levelType,
      difficulty,
    }
  }

  if (entry.kind === 'chapter_progress') {
    const chapter = resolveChapterLabel(entry, translations, lang)
    if (!chapter) return null

    const templateKey = 'LC_COMMON_cloth_trial_tips8'
    const template = translations[templateKey]
    if (!template || isNoDataTranslation(templateKey, template, lang)) return null

    const condition = formatProgressCondition(template, entry.progress)
    if (!condition) return null

    const levelType = entry.levelType
    const difficulty = resolveLevelTypeLabel(levelType, translations, lang)

    return {
      ...base,
      id: `${idParts.join(':')}:${entry.progress ?? 0}`,
      chapter,
      condition,
      chapterId: entry.chapterId ?? entry.progressChapterId,
      progress: entry.progress,
      levelType,
      difficulty,
    }
  }

  if (entry.kind === 'sweep' && entry.levelId != null) {
    const chapter = resolveStageLevelName(entry, translations, lang)
    const stage = resolveLevelLabel(entry, translations, lang)
    if (!chapter || !stage) return null
    const levelType = entry.levelType
    const difficulty = resolveLevelTypeLabel(levelType, translations, lang)

    return {
      ...base,
      id: `sweep:${entry.levelId}`,
      chapter,
      stage,
      levelId: entry.levelId,
      levelType,
      difficulty,
    }
  }

  return null
}

function collectTranslationKeys(entries: ItemStageRewardEntry[]): string[] {
  const keys = new Set<string>()
  for (const entry of entries) {
    if (entry.levelNameKey) keys.add(entry.levelNameKey)
    if (entry.levelId != null) {
      keys.add(`LC_LEVEL_name_${entry.levelId}`)
    }
    const chapterNameKey = resolveChapterNameKey(entry)
    if (chapterNameKey) keys.add(chapterNameKey)
    keys.add(STAGE_REWARD_KIND_LABEL_KEYS[entry.kind] ?? '')
    if (entry.kind === 'exchange_unlock') {
      keys.add('LC_UNLOCK_exchange_fb_node')
    }
    if (entry.kind === 'first_clear') {
      keys.add('LC_COMMON_normal_reward')
    }
    if (entry.kind === 'sweep') {
      keys.add('LC_COMMON_level_reward')
    }
    if (entry.kind === 'chapter_award' || entry.kind === 'chapter_progress') {
      keys.add('LC_COMMON_chapter_reward')
      if (entry.chapterMode) {
        keys.add(LEVEL_TYPE_LC_KEYS[CHAPTER_MODE_TO_LEVEL_TYPE[entry.chapterMode]])
      }
    }
    if (entry.levelType != null && entry.levelType in LEVEL_TYPE_LC_KEYS) {
      keys.add(LEVEL_TYPE_LC_KEYS[entry.levelType])
    }
    if (entry.kind === 'chapter_progress') {
      keys.add('LC_COMMON_cloth_trial_tips8')
      keys.add('LC_COMMON_chapter_progress')
    }
  }
  return [...keys].filter(Boolean)
}

const STAGE_REWARD_KINDS: ItemStageRewardKind[] = [
  'first_clear',
  'sweep',
  'chapter_award',
  'chapter_progress',
]

export async function loadItemStageRewardLines(
  itemId: number,
  lang: string
): Promise<ItemStageRewardLine[]> {
  const { stageRewardLines } = await loadItemStageSourceLines(itemId, lang)
  return stageRewardLines
}

export async function loadItemExchangeUnlockLines(
  itemId: number,
  lang: string
): Promise<ItemStageRewardLine[]> {
  const { exchangeUnlockLines } = await loadItemStageSourceLines(itemId, lang)
  return exchangeUnlockLines
}

export async function loadItemStageSourceLines(
  itemId: number,
  lang: string
): Promise<{
  stageRewardLines: ItemStageRewardLine[]
  exchangeUnlockLines: ItemStageRewardLine[]
}> {
  const index = await loadStageRewardsIndex()
  const entries = index.byItemId[String(itemId)] ?? []
  if (!entries.length) {
    return { stageRewardLines: [], exchangeUnlockLines: [] }
  }

  const stageEntries = entries
    .filter((e) => STAGE_REWARD_KINDS.includes(e.kind))
    .sort((a, b) => {
      const order = STAGE_REWARD_KINDS
      const ai = order.indexOf(a.kind)
      const bi = order.indexOf(b.kind)
      if (ai !== bi) return ai - bi
      if (a.levelType != null && b.levelType != null) {
        const typeDiff = a.levelType - b.levelType
        if (typeDiff !== 0) return typeDiff
      }
      const aShow = a.showId ?? a.chapter ?? 0
      const bShow = b.showId ?? b.chapter ?? 0
      if (aShow !== bShow) return aShow - bShow
      const serialDiff = (a.levelSerial ?? 0) - (b.levelSerial ?? 0)
      if (serialDiff !== 0) return serialDiff
      if (a.chapterId != null && b.chapterId != null) {
        const chapterDiff = a.chapterId - b.chapterId
        if (chapterDiff !== 0) return chapterDiff
      }
      if (a.strongholdChapterId != null && b.strongholdChapterId != null) {
        return (
          a.strongholdChapterId - b.strongholdChapterId ||
          (a.progress ?? 0) - (b.progress ?? 0)
        )
      }
      return (a.levelId ?? 0) - (b.levelId ?? 0)
    })

  const seenUnlockLevels = new Set<number>()
  const dedupedUnlock = entries
    .filter((e) => e.kind === 'exchange_unlock')
    .filter((e) => {
      if (e.levelId == null || seenUnlockLevels.has(e.levelId)) return false
      seenUnlockLevels.add(e.levelId)
      return true
    })
    .sort((a, b) => (a.levelId ?? 0) - (b.levelId ?? 0))

  const allKeys = collectTranslationKeys([...stageEntries, ...dedupedUnlock])
  const translations = await translateKeys(allKeys, lang)

  const noDataLabel = getNoDataLabel(lang)

  const stageRewardLines = mergeStageRewardLines(
    stageEntries
      .map((entry, i) => {
        const built = buildStageRewardLine(entry, translations, lang)
        if (!built) return null
        return {
          ...built,
          id: `${entry.kind}:${entry.chapterId ?? entry.strongholdChapterId ?? entry.levelId ?? i}:${i}`,
        }
      })
      .filter(
        (row): row is ItemStageRewardLine =>
          row != null && isValidStageRewardLine(row, noDataLabel)
      )
  ).sort(compareStageRewardLines)

  const exchangeUnlockLines = dedupedUnlock
    .map((entry, i) => {
      const built = buildStageRewardLine(entry, translations, lang)
      if (!built) return null
      return {
        ...built,
        id: `${entry.kind}:${entry.levelId}:${i}`,
      }
    })
    .filter((row): row is ItemStageRewardLine => row != null && isValidStageRewardLine(row, noDataLabel))

  return { stageRewardLines, exchangeUnlockLines }
}

export function splitStageRewardLines(lines: ItemStageRewardLine[]): {
  chapterRewardLines: ItemStageRewardLine[]
  progressRewardLines: ItemStageRewardLine[]
} {
  const chapterRewardLines: ItemStageRewardLine[] = []
  const progressRewardLines: ItemStageRewardLine[] = []

  for (const line of lines) {
    if (line.kind === 'chapter_progress') {
      progressRewardLines.push(line)
    } else {
      chapterRewardLines.push(line)
    }
  }

  progressRewardLines.sort((a, b) => compareStageRewardLines(a, b))

  return { chapterRewardLines, progressRewardLines }
}

export type ItemObtainMode = {
  levelType: LevelType
  label: string
}

/** Unique Story / Elite / Nightmare tabs inferred from stage & progress reward lines. */
export function collectItemObtainModes(lines: ItemStageRewardLine[]): ItemObtainMode[] {
  const byType = new Map<LevelType, string>()
  for (const line of lines) {
    if (line.levelType == null || !line.difficulty?.trim()) continue
    byType.set(line.levelType, line.difficulty)
  }
  return [...byType.entries()]
    .sort(([a], [b]) => a - b)
    .map(([levelType, label]) => ({ levelType, label }))
}

export function filterObtainModesNotInGetPath(
  modes: ItemObtainMode[],
  getPathFunopenIds: Iterable<number>,
  getPathLabels: Iterable<string> = []
): ItemObtainMode[] {
  const coveredLevelTypes = collectGetPathCoveredLevelTypes(getPathFunopenIds)
  const existingLabels = new Set(
    [...getPathLabels].map((label) => label.trim().toLowerCase()).filter(Boolean)
  )
  return modes.filter((mode) => {
    if (coveredLevelTypes.has(mode.levelType)) return false
    if (existingLabels.has(mode.label.trim().toLowerCase())) return false
    return true
  })
}
