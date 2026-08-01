import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Same catalog bound as heroes list / team-builder (`RoleConfig.id <= 1499`). */
export const MAX_LISTED_HERO_ID = 1499

function parseHiddenArray(tsPath, exportName) {
  try {
    const text = readFileSync(tsPath, 'utf8')
    const re = new RegExp(`export const ${exportName}[^\\[]*\\[([^\\]]*)\\]`)
    const match = text.match(re)
    if (!match) return new Set()
    return new Set([...match[1].matchAll(/\d+/g)].map((m) => Number(m[0])))
  } catch {
    return new Set()
  }
}

export function loadHiddenSets(root) {
  const base = join(root, 'src/lib/game')
  return {
    heroes: parseHiddenArray(join(base, 'hidden-hero-ids.ts'), 'HIDDEN_HERO_IDS'),
    companions: parseHiddenArray(join(base, 'hidden-companion-ids.ts'), 'HIDDEN_COMPANION_IDS'),
    forceCards: parseHiddenArray(join(base, 'hidden-force-card-ids.ts'), 'HIDDEN_FORCE_CARD_IDS'),
    items: parseHiddenArray(join(base, 'hidden-item-ids.ts'), 'HIDDEN_ITEM_IDS'),
  }
}

export function isListed(hidden, type, id) {
  const n = Number(id)
  if (!Number.isFinite(n)) return false
  if (type === 'hero') return n <= MAX_LISTED_HERO_ID && !hidden.heroes.has(n)
  if (type === 'companion') return !hidden.companions.has(n)
  if (type === 'force_card') return !hidden.forceCards.has(n)
  if (type === 'item') return !hidden.items.has(n)
  return true
}
