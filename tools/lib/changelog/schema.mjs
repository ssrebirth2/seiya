/** Shared constants + empty document shapes for DB changelog. */

export const SITE_LANGS = ['CN', 'PT', 'EN', 'SP', 'FR', 'ID']

export const ENTITY_ORDER = [
  'hero',
  'skill',
  'companion',
  'artifact',
  'force_card',
  'item',
  'bond',
  'cosmo',
  'talent',
  // Hero Overview tab (detail) — keyed by heroId like cosmo/talent
  'cloth',
  'figure',
  'hero_star',
  'hero_awaken',
]

/** Entity types that belong to a hero detail page and group under that hero. */
export const HERO_SCOPED_ENTITY_TYPES = [
  'cosmo',
  'talent',
  'cloth',
  'figure',
  'hero_star',
  'hero_awaken',
]

export const ACTION_ORDER = { added: 0, updated: 1, removed: 2 }

export const MAX_RELEASES = 30
/** Home teaser only — full `/changelog` page renders every entry in the release. */
export const HOME_ENTRY_LIMIT = 12
/** @deprecated Kept for callers; releases no longer truncate at build time. */
export const MAX_ENTRIES_PER_RELEASE = Infinity

/** Bump when snapshot entity shapes change (forces baseline, avoids false "added" flood). */
export const SNAPSHOT_VERSION = 2
export const CHANGELOG_VERSION = 1

export function emptyLangMap(fallback = '') {
  const out = {}
  for (const lang of SITE_LANGS) out[lang] = fallback
  return out
}

export function emptyChangelog() {
  return {
    version: CHANGELOG_VERSION,
    generatedAt: new Date().toISOString(),
    releases: [],
  }
}

export function emptySnapshot() {
  return {
    version: SNAPSHOT_VERSION,
    createdAt: new Date().toISOString(),
    entities: {
      hero: {},
      skill: {},
      companion: {},
      artifact: {},
      force_card: {},
      item: {},
      bond: {},
      cosmo: {},
      talent: {},
      cloth: {},
      figure: {},
      hero_star: {},
      hero_awaken: {},
    },
    lc: Object.fromEntries(SITE_LANGS.map((l) => [l, {}])),
    skillValues: {},
    skillOwners: {},
  }
}
