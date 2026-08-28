import { heroIdFromRoleFigureItemId } from '@/lib/game/figure-ref'
import type {
  ChangelogEntry,
  ChangelogRelease,
  DbChangelogDocument,
  LangTextMap,
} from '@/lib/changelog/types'

function applyLcPlaceholders(template: string, args: string[]): string {
  let result = template
  for (let i = 0; i < args.length; i++) {
    const placeholder = `{${i}}`
    if (!result.includes(placeholder)) continue
    result = result.split(placeholder).join(args[i])
  }
  return result
}

const HERO_SCOPED: ReadonlySet<string> = new Set([
  'hero',
  'figure',
  'cloth',
  'cosmo',
  'talent',
  'hero_star',
  'hero_awaken',
])

function langMapHasPlaceholder(map: LangTextMap | undefined): boolean {
  if (!map) return false
  return Object.values(map).some((v) => typeof v === 'string' && /\{[0-9]+\}/.test(v))
}

function isCnFallback(lang: string, value: string, cn: string): boolean {
  return lang !== 'CN' && Boolean(cn) && value === cn
}

function pickHeroArg(args: LangTextMap, lang: string): string {
  const cn = args.CN || ''
  const direct = args[lang]
  if (direct && !isCnFallback(lang, direct, cn)) return direct
  if (args.EN && !isCnFallback('EN', args.EN, cn)) return args.EN
  if (args.PT && !isCnFallback('PT', args.PT, cn)) return args.PT
  return direct || args.EN || args.PT || cn || ''
}

function applyPlaceholdersToLangMap(map: LangTextMap, args: LangTextMap): LangTextMap {
  const out: LangTextMap = { ...map }
  for (const lang of Object.keys(map)) {
    const text = map[lang]
    if (typeof text !== 'string' || !/\{[0-9]+\}/.test(text)) continue
    const arg = pickHeroArg(args, lang)
    if (!arg) continue
    out[lang] = applyLcPlaceholders(text, [arg])
  }
  return out
}

/** Keep the best per-language label (skip CN leaked into other langs; prefer longer full names). */
function mergeHeroTitle(existing: LangTextMap | undefined, incoming: LangTextMap): LangTextMap {
  const cn = incoming.CN || existing?.CN || ''
  const out: LangTextMap = { ...(existing || {}) }
  for (const [lang, raw] of Object.entries(incoming)) {
    if (typeof raw !== 'string' || !raw) continue
    const prev = out[lang]
    if (!prev) {
      out[lang] = raw
      continue
    }
    const prevFallback = isCnFallback(lang, prev, out.CN || cn)
    const incomingFallback = isCnFallback(lang, raw, incoming.CN || cn)
    if (prevFallback && !incomingFallback) out[lang] = raw
    else if (!prevFallback && incomingFallback) continue
    else if (raw.length > prev.length) out[lang] = raw
  }
  return out
}

function indexHeroTitles(releases: ChangelogRelease[]): Map<number, LangTextMap> {
  const map = new Map<number, LangTextMap>()
  const consider = (id: number, title?: LangTextMap) => {
    if (!title || !Number.isFinite(id) || langMapHasPlaceholder(title)) return
    map.set(id, mergeHeroTitle(map.get(id), title))
  }
  for (const release of releases) {
    for (const e of release.entries) {
      if (HERO_SCOPED.has(e.entityType)) consider(Number(e.entityId), e.title)
      if (e.owner?.type === 'hero') consider(e.owner.id, e.owner.title)
    }
  }
  return map
}

function fillEntry(entry: ChangelogEntry, heroTitle: LangTextMap) {
  if (langMapHasPlaceholder(entry.title)) {
    entry.title = applyPlaceholdersToLangMap(entry.title, heroTitle)
  }
  if (entry.owner?.title && langMapHasPlaceholder(entry.owner.title)) {
    entry.owner.title = applyPlaceholdersToLangMap(entry.owner.title, heroTitle)
  }
  if (!entry.changes) return
  for (const change of entry.changes) {
    if (change.before && langMapHasPlaceholder(change.before)) {
      change.before = applyPlaceholdersToLangMap(change.before, heroTitle)
    }
    if (change.after && langMapHasPlaceholder(change.after)) {
      change.after = applyPlaceholdersToLangMap(change.after, heroTitle)
    }
  }
}

/**
 * Fill `{0}` in figurine item titles using hero names already present in the changelog.
 * Mirrors GameUtil.GetItemNameByConfig (LC_ITEM_figure_name + des_value hero name).
 */
export function resolveChangelogItemPlaceholders(doc: DbChangelogDocument): DbChangelogDocument {
  const releases = doc.releases ?? []
  const heroTitles = indexHeroTitles(releases)
  for (const release of releases) {
    for (const entry of release.entries) {
      if (entry.entityType !== 'item') continue
      const heroId = heroIdFromRoleFigureItemId(Number(entry.entityId))
      if (heroId == null) continue
      const heroTitle = heroTitles.get(heroId)
      if (!heroTitle) continue
      fillEntry(entry, heroTitle)
    }
  }
  return doc
}
