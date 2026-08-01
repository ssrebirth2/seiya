/**
 * Display name for item stage-reward rows.
 *
 * Official BigLevelItemView has two labels:
 * - levelid  → GameUtil.GetLevelIndexName (difficulty + show_id-serial) — site: stage code
 * - levelname → GameUtil.GetLevelNameByLevelConfig
 *
 * For the site list we already show show_id-serial separately, so we use the LC
 * strings as stored (no serial glued onto chapter_name — that produces "Ⅱ1" / "I3"
 * next to "184-1" / "138-3").
 *
 * - normal_level (1): NpcRoster.level_name (LC_LEVEL_name_*) as in the game
 * - hard/nightmare (2/3): ChapterConfig.chapter_name LC only (serial lives in stage code)
 */
export type LevelDisplayNameInput = {
  /** LevelConfig.function_type mapped to 1/2/3. */
  levelType?: 1 | 2 | 3
  /** From NpcRoster.level_name when function_type is normal_level. */
  levelNameKey?: string
  /** LC key for ChapterConfig.chapter_name (e.g. LC_Level_chapter_name_384). */
  chapterNameKey?: string
}

export function resolveGameLevelDisplayName(
  input: LevelDisplayNameInput,
  translations: Record<string, string>,
  isUsable: (key: string, value: string | undefined) => boolean
): string {
  // GameUtil: function_type == normal_level → roster.level_name
  if (input.levelType === 1 && input.levelNameKey) {
    const rosterName = translations[input.levelNameKey]
    if (isUsable(input.levelNameKey, rosterName)) {
      return rosterName!.trim()
    }
  }

  // Elite / nightmare: chapter LC as-is (serial is the adjacent show_id-serial code)
  if (input.chapterNameKey) {
    const chapterName = translations[input.chapterNameKey]
    if (isUsable(input.chapterNameKey, chapterName)) {
      return chapterName!.trim()
    }
  }

  return ''
}
