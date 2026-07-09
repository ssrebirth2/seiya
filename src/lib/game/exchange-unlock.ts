import { parseGameData } from '@/lib/game/parse-game-data'
import type { TalentUnlockEntry } from '@/lib/game/talent-types'

export type ExchangeUnlockEntry = TalentUnlockEntry

/** ExchangeConditionConfig.unlock — same tuple shape as hero talent unlock rows. */
export function parseExchangeUnlock(raw: unknown): ExchangeUnlockEntry[] {
  return parseGameData(raw).flatMap((item) => {
    if (Array.isArray(item) && item.length >= 4) {
      return [
        {
          desc: String(item[0] ?? ''),
          object_id: item[1] != null ? Number(item[1]) : null,
          type: String(item[2] ?? ''),
          value: item[3] != null ? Number(item[3]) : undefined,
        },
      ]
    }
    if (item && typeof item === 'object' && 'desc' in item) {
      const o = item as Record<string, unknown>
      return [
        {
          desc: String(o.desc ?? ''),
          object_id: o.object_id != null ? Number(o.object_id) : null,
          type: String(o.type ?? ''),
          value: o.value != null ? Number(o.value) : undefined,
        },
      ]
    }
    return []
  })
}

export function collectExchangeUnlockTranslationKeys(entries: ExchangeUnlockEntry[]): string[] {
  const keys = new Set<string>()
  for (const entry of entries) {
    if (entry.desc) keys.add(entry.desc)
    if (entry.type === 'fb_node' && entry.value != null) {
      keys.add(`LC_LEVEL_name_${entry.value}`)
    }
  }
  return [...keys]
}

function resolveUnlockPlaceholder(
  entry: ExchangeUnlockEntry,
  translations: Record<string, string>
): string | undefined {
  if (entry.value == null) return undefined

  if (entry.type === 'fb_node') {
    const levelNameKey = `LC_LEVEL_name_${entry.value}`
    const levelName = translations[levelNameKey]
    if (levelName && levelName !== levelNameKey) return levelName
  }

  return String(entry.value)
}

export function resolveExchangeUnlockLine(
  entry: ExchangeUnlockEntry,
  translations: Record<string, string>
): string {
  if (!entry.desc) return ''
  const template = translations[entry.desc] ?? entry.desc
  const placeholder = resolveUnlockPlaceholder(entry, translations)
  if (placeholder == null) return template
  return template.replace(/\{0\}/g, placeholder)
}

export function resolveExchangeUnlockLines(
  entries: ExchangeUnlockEntry[],
  translations: Record<string, string>
): string[] {
  return entries
    .map((entry) => resolveExchangeUnlockLine(entry, translations))
    .filter(Boolean)
}
