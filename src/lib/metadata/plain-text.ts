import { formatDisplayText } from '@/lib/game/apply-skill-values'

const MAX_DESCRIPTION_LENGTH = 300

/** Strips game markup for Open Graph / meta description fields. */
export function toPlainMetadataText(text: string | undefined | null): string {
  if (!text?.trim()) return ''

  const formatted = formatDisplayText(text, 0, {})
  return formatted
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DESCRIPTION_LENGTH)
}
