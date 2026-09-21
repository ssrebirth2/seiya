import { supabase } from '@/lib/supabase-client'
import {
  normalizeSkillRefList,
  parseGameData,
  parsePrimitiveList,
} from '@/lib/game/parse-game-data'

export type SkillOwnerType =
  | 'hero'
  | 'force_card'
  | 'artifact'
  | 'spirit'
  | 'npc'
  | 'system'

export type SkillOwner = {
  type: SkillOwnerType
  id: number
}

export type SkillOwnerIndex = Map<number, SkillOwner[]>

const PAGE = 1000

async function fetchAllRows<T extends Record<string, unknown>>(
  table: string,
  columns: string
): Promise<T[]> {
  const rows: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1)
    if (error) {
      console.warn(`[skill-owners] ${table}: ${error.message}`)
      break
    }
    const batch = (data || []) as unknown as T[]
    rows.push(...batch)
    if (batch.length < PAGE) break
    from += PAGE
  }
  return rows
}

function pushOwner(index: SkillOwnerIndex, skillId: unknown, owner: SkillOwner) {
  const id = Number(skillId)
  if (!Number.isFinite(id) || id <= 0) return
  if (!Number.isFinite(owner.id) || owner.id <= 0) return
  let list = index.get(id)
  if (!list) {
    list = []
    index.set(id, list)
  }
  if (!list.some((o) => o.type === owner.type && o.id === owner.id)) {
    list.push(owner)
  }
}

function skillIdsFromSkillUp(raw: unknown): number[] {
  const ids: number[] = []
  for (const entry of parseGameData(raw)) {
    if (Array.isArray(entry) && entry.length) {
      const n = Number(entry[0])
      if (Number.isFinite(n)) ids.push(n)
    } else if (typeof entry === 'number' && Number.isFinite(entry)) {
      ids.push(entry)
    } else if (entry && typeof entry === 'object') {
      const n = Number((entry as { skill_id?: unknown; skillid?: unknown }).skill_id ?? (entry as { skillid?: unknown }).skillid)
      if (Number.isFinite(n)) ids.push(n)
    }
  }
  return ids
}

function extractSkillId(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const refs = normalizeSkillRefList(raw)
  if (refs.length) return refs[0].skill_id
  const list = parsePrimitiveList(raw)
  if (list.length) {
    const n = Number(list[0])
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Unique SkillConfig ids referenced by HeroAwakenInfoConfig.add_skill
 * (includes ids missing from SkillConfig itself).
 */
export async function collectHeroAwakenAddSkillIds(): Promise<number[]> {
  const ids = new Set<number>()
  try {
    const infos = await fetchAllRows<{ add_skill?: unknown }>('HeroAwakenInfoConfig', 'add_skill')
    for (const row of infos) {
      for (const ref of normalizeSkillRefList(row.add_skill)) {
        if (ref.skill_id) ids.add(ref.skill_id)
      }
    }
  } catch {
    /* optional */
  }
  return [...ids]
}

function expandSubSkillOwners(
  index: SkillOwnerIndex,
  subSkillsById: Map<number, number[]>
) {
  let guard = 0
  let grew = true
  while (grew && guard < 8) {
    grew = false
    guard++
    for (const [skillId, owners] of index.entries()) {
      const subs = subSkillsById.get(skillId)
      if (!subs?.length) continue
      for (const sid of subs) {
        const before = index.get(sid)?.length ?? 0
        for (const owner of owners) pushOwner(index, sid, owner)
        if ((index.get(sid)?.length ?? 0) > before) grew = true
      }
    }
  }
}

/**
 * Build skill → owners map from live Supabase configs.
 * Mirrors changelog ownership (heroes, spirits, force cards, artifacts) + NPC/system light touch.
 */
export async function buildSkillOwnerIndex(
  subSkillsById?: Map<number, number[]>
): Promise<SkillOwnerIndex> {
  const index: SkillOwnerIndex = new Map()

  const roles = await fetchAllRows<{
    id: number
    skills?: unknown
    battle_show_skills?: unknown
  }>('RoleConfig', 'id, skills, battle_show_skills')

  for (const row of roles) {
    const heroId = Number(row.id)
    if (!Number.isFinite(heroId) || heroId < 1000 || heroId >= 2000) continue
    for (const sid of parsePrimitiveList(row.skills)) {
      pushOwner(index, sid, { type: 'hero', id: heroId })
    }
    for (const sid of parsePrimitiveList(row.battle_show_skills)) {
      pushOwner(index, sid, { type: 'hero', id: heroId })
    }
  }

  try {
    const spirits = await fetchAllRows<{ id: number; skill_id?: unknown }>(
      'SpiritConfig',
      'id, skill_id'
    )
    for (const row of spirits) {
      const sid = extractSkillId(row.skill_id)
      if (sid != null) pushOwner(index, sid, { type: 'spirit', id: Number(row.id) })
    }
  } catch {
    /* optional */
  }

  try {
    const infos = await fetchAllRows<{
      id: number
      card_star?: unknown
      card_awaken?: unknown
    }>('ForceCardInfoConfig', 'id, card_star, card_awaken')

    const starIds = new Set<number>()
    const awakenIds = new Set<number>()
    const cardStarMap = new Map<number, number[]>()
    const cardAwakenMap = new Map<number, number[]>()

    for (const row of infos) {
      const cardId = Number(row.id)
      const stars = parsePrimitiveList(row.card_star).map(Number).filter(Number.isFinite)
      const awakens = parsePrimitiveList(row.card_awaken).map(Number).filter(Number.isFinite)
      cardStarMap.set(cardId, stars)
      cardAwakenMap.set(cardId, awakens)
      stars.forEach((i) => starIds.add(i))
      awakens.forEach((i) => awakenIds.add(i))
    }

    const starRows =
      starIds.size > 0
        ? await fetchAllRows<{ id: number; skill_up?: unknown }>('ForceCardStarUpConfig', 'id, skill_up')
        : []
    const awakenRows =
      awakenIds.size > 0
        ? await fetchAllRows<{ id: number; skill_up?: unknown }>(
            'ForceCardAwakenUpConfig',
            'id, skill_up'
          )
        : []

    const starById = new Map(starRows.map((r) => [Number(r.id), r]))
    const awakenById = new Map(awakenRows.map((r) => [Number(r.id), r]))

    for (const [cardId, ids] of cardStarMap) {
      for (const configId of ids) {
        for (const skillId of skillIdsFromSkillUp(starById.get(configId)?.skill_up)) {
          pushOwner(index, skillId, { type: 'force_card', id: cardId })
        }
      }
    }
    for (const [cardId, ids] of cardAwakenMap) {
      for (const configId of ids) {
        for (const skillId of skillIdsFromSkillUp(awakenById.get(configId)?.skill_up)) {
          pushOwner(index, skillId, { type: 'force_card', id: cardId })
        }
      }
    }
  } catch {
    /* optional */
  }

  try {
    const starRows = await fetchAllRows<{ artifact_id?: number; skill_up?: unknown }>(
      'ArtifactStarConfig',
      'artifact_id, skill_up'
    )
    for (const row of starRows) {
      const artifactId = Number(row.artifact_id)
      if (!Number.isFinite(artifactId)) continue
      for (const skillId of skillIdsFromSkillUp(row.skill_up)) {
        pushOwner(index, skillId, { type: 'artifact', id: artifactId })
      }
    }
  } catch {
    /* optional */
  }

  // Hero awaken add_skill
  try {
    const awakenCfgs = await fetchAllRows<{ id: number; awaken_list?: unknown }>(
      'HeroAwakenConfig',
      'id, awaken_list'
    )
    const awakenIds = new Set<number>()
    const heroAwakenMap = new Map<number, number[]>()
    for (const row of awakenCfgs) {
      const heroId = Number(row.id)
      if (!Number.isFinite(heroId) || heroId < 1000 || heroId >= 2000) continue
      const ids = parsePrimitiveList(row.awaken_list).map(Number).filter(Number.isFinite)
      heroAwakenMap.set(heroId, ids)
      ids.forEach((i) => awakenIds.add(i))
    }
    if (awakenIds.size) {
      const infos = await fetchAllRows<{ id: number; add_skill?: unknown }>(
        'HeroAwakenInfoConfig',
        'id, add_skill'
      )
      const byId = new Map(infos.map((r) => [Number(r.id), r]))
      for (const [heroId, ids] of heroAwakenMap) {
        for (const aid of ids) {
          const skillId = extractSkillId(byId.get(aid)?.add_skill)
          if (skillId != null) {
            pushOwner(index, skillId, { type: 'hero', id: heroId })
            break
          }
        }
      }
    }
  } catch {
    /* optional */
  }

  // Bond / relation skills
  try {
    const relations = await fetchAllRows<{
      skill_id?: unknown
      hero_id?: unknown
      hero_list?: unknown
    }>('HeroRelationSkillConfig', 'skill_id, hero_id, hero_list')
    for (const row of relations) {
      const skillId = extractSkillId(row.skill_id)
      if (skillId == null) continue
      const primary = Number(row.hero_id)
      if (Number.isFinite(primary) && primary >= 1000 && primary < 2000) {
        pushOwner(index, skillId, { type: 'hero', id: primary })
      }
      for (const hid of parsePrimitiveList(row.hero_list)) {
        const n = Number(hid)
        if (Number.isFinite(n) && n >= 1000 && n < 2000) {
          pushOwner(index, skillId, { type: 'hero', id: n })
        }
      }
    }
  } catch {
    /* optional */
  }

  if (subSkillsById) {
    expandSubSkillOwners(index, subSkillsById)
  }

  return index
}

export function ownerHref(owner: SkillOwner): string | undefined {
  switch (owner.type) {
    case 'hero':
      return `/heroes/${owner.id}`
    case 'force_card':
      return `/force-cards/${owner.id}`
    case 'artifact':
      return `/artifacts/${owner.id}`
    case 'spirit':
      return `/companions/${owner.id}`
    default:
      return undefined
  }
}
