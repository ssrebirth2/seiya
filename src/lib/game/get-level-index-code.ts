/**
 * Player-facing stage index code (e.g. "184-1").
 *
 * Mirrors GameUtil.GetLevelIndexName numeric part:
 *   chapterCfg.show_id .. "-" .. levelCfg.level_serial
 *
 * Difficulty prefix (LC_Chpter_level_type*) is rendered separately in the UI.
 * Prefer ChapterConfig.show_id over LevelConfig.chapter when they differ
 * (elite/nightmare chapters).
 */
export function getLevelIndexCode(
  showIdOrChapter: number | null | undefined,
  levelSerial: number | null | undefined
): string {
  if (showIdOrChapter == null || levelSerial == null) return ''
  return `${showIdOrChapter}-${levelSerial}`
}
