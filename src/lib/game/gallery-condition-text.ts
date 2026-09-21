import type { GalleryCondition, GalleryEntry } from '@/lib/game/gallery-types'

/** Game GalleryConfig mis-tags some rows; map condition type → correct unlock LC. */
const CONDITION_DESC_OVERRIDE: Record<string, string> = {
  hero_skin: 'LC_UNLOCK_hero_skin',
}

/** Apply {0}/{1} placeholders with resolved names (game GetLCString). */
export function fillGalleryTemplate(
  template: string,
  arg0?: string | null,
  arg1?: string | null
): string {
  let text = template
  if (arg0 != null && arg0 !== '') {
    text = text.replaceAll('{0}', arg0)
  }
  if (arg1 != null && arg1 !== '') {
    text = text.replaceAll('{1}', arg1)
  }
  // Drop leftover placeholders rather than showing raw {0}/{1}
  text = text.replaceAll('{0}', '').replaceAll('{1}', '')
  return text.replace(/\s{2,}/g, ' ').trim()
}

function resolveCondArg0(cond: GalleryCondition, getT: (key: string) => string): string {
  if (cond.arg0Key) {
    const t = getT(cond.arg0Key)
    if (t && t !== cond.arg0Key) return t
  }
  return ''
}

function resolveCondArg1(cond: GalleryCondition, getT: (key: string) => string): string {
  if (cond.arg1Key) {
    const t = getT(cond.arg1Key)
    if (t && t !== cond.arg1Key) return t
  }
  if (cond.arg1Literal != null && cond.arg1Literal !== '') return String(cond.arg1Literal)
  return ''
}

function templateKeyForEntry(entry: GalleryEntry, first: GalleryCondition | undefined): string | null {
  if (first?.type && CONDITION_DESC_OVERRIDE[first.type]) {
    return CONDITION_DESC_OVERRIDE[first.type]
  }
  return first?.descKey || entry.descKey || null
}

/**
 * Format gallery unlock requirement text like GalleryItemClass:GetConditionText.
 * Never substitutes raw object ids into {0}.
 */
export function formatGalleryRequirement(
  entry: GalleryEntry,
  getT: (key: string) => string,
  orJoinLabel: string
): string {
  const conditions = entry.conditions
  if (!conditions.length) {
    const template = entry.descKey ? getT(entry.descKey) : ''
    if (!template || template === entry.descKey) return entry.descKey ? getT(entry.descKey) : '—'
    const name =
      entry.nameKey && getT(entry.nameKey) !== entry.nameKey ? getT(entry.nameKey) : ''
    return fillGalleryTemplate(template, name, null) || template
  }

  const first = conditions[0]
  const templateKey = templateKeyForEntry(entry, first)
  if (!templateKey) {
    return (
      conditions
        .map((c) =>
          [c.type, c.arg0Key ? getT(c.arg0Key) : null, c.arg1Literal].filter(Boolean).join(' ')
        )
        .filter(Boolean)
        .join(` ${orJoinLabel} `) || '—'
    )
  }

  const template = getT(templateKey)
  if (!template || template === templateKey) return templateKey

  if (conditions.length > 1) {
    const names = conditions.map((c) => resolveCondArg0(c, getT)).filter(Boolean)
    const unique = [...new Set(names)]
    const joinKey = 'LC_COMMON_split_unit'
    const joinRaw = getT(joinKey)
    const join = joinRaw && joinRaw !== joinKey ? joinRaw : orJoinLabel
    const namesStr = unique.join(join)
    const valueStr = resolveCondArg1(first, getT)
    return fillGalleryTemplate(template, namesStr, valueStr) || template
  }

  return (
    fillGalleryTemplate(template, resolveCondArg0(first, getT), resolveCondArg1(first, getT)) ||
    template
  )
}
