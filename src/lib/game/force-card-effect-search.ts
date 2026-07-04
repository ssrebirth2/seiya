import { supabase } from '@/lib/supabase-client'
import { createTranslationGetter, translateKeys } from '@/lib/i18n/language-package'
import { formatPlainLabel } from '@/lib/game/apply-skill-values'
import { normalizeDesValueList, normalizeSkillRefList } from '@/lib/game/parse-game-data'

type ForceCardInfoRow = {
  id: number
  card_star?: unknown
  card_awaken?: unknown
}

type SkillRow = {
  skillid: number | string
  name?: string
  skill_des?: unknown
  skill_sketch?: unknown
}

function parseConfigIdList(val: unknown): number[] {
  if (val == null || val === '') return []
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val
    if (!Array.isArray(parsed)) return []
    return parsed.map(Number).filter((n) => !Number.isNaN(n) && n > 0)
  } catch {
    return []
  }
}

function collectSkillDesKeys(skill: SkillRow): string[] {
  const keys = new Set<string>()
  if (skill.name?.startsWith?.('LC_')) keys.add(skill.name)
  normalizeDesValueList(skill.skill_des).forEach((entry) => entry.des && keys.add(entry.des))
  normalizeDesValueList(skill.skill_sketch).forEach((entry) => entry.des && keys.add(entry.des))
  return Array.from(keys)
}

/** Case- and accent-insensitive text for catalog search. */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Plain searchable effect text per card: star/awaken skill descriptions only (not story desc).
 */
export async function buildForceCardEffectSearchIndex(
  cards: Array<{ id: number }>,
  infoRows: ForceCardInfoRow[],
  lang: string
): Promise<Map<number, string>> {
  const index = new Map<number, string>()
  if (!cards.length) return index

  const infoById = new Map(infoRows.map((row) => [row.id, row]))
  const starUpIds = new Set<number>()
  const awakenIds = new Set<number>()

  for (const card of cards) {
    const info = infoById.get(card.id)
    parseConfigIdList(info?.card_star).forEach((id) => starUpIds.add(id))
    parseConfigIdList(info?.card_awaken).forEach((id) => awakenIds.add(id))
  }

  const [starUpsRes, awakensRes] = await Promise.all([
    starUpIds.size
      ? supabase.from('ForceCardStarUpConfig').select('id,skill_up').in('id', Array.from(starUpIds))
      : Promise.resolve({ data: [] as { id: number; skill_up?: unknown }[] }),
    awakenIds.size
      ? supabase
          .from('ForceCardAwakenUpConfig')
          .select('id,skill_up')
          .in('id', Array.from(awakenIds))
      : Promise.resolve({ data: [] as { id: number; skill_up?: unknown }[] }),
  ])

  const starUpById = new Map((starUpsRes.data || []).map((row) => [row.id, row]))
  const awakenById = new Map((awakensRes.data || []).map((row) => [row.id, row]))

  const skillIds = new Set<number>()
  const cardSkillIds = new Map<number, Set<number>>()

  for (const card of cards) {
    const info = infoById.get(card.id)
    const ids = new Set<number>()

    for (const configId of parseConfigIdList(info?.card_star)) {
      normalizeSkillRefList(starUpById.get(configId)?.skill_up).forEach((ref) => {
        ids.add(ref.skill_id)
        skillIds.add(ref.skill_id)
      })
    }

    for (const configId of parseConfigIdList(info?.card_awaken)) {
      normalizeSkillRefList(awakenById.get(configId)?.skill_up).forEach((ref) => {
        ids.add(ref.skill_id)
        skillIds.add(ref.skill_id)
      })
    }

    cardSkillIds.set(card.id, ids)
  }

  const { data: skills } = skillIds.size
    ? await supabase
        .from('SkillConfig')
        .select('skillid,name,skill_des,skill_sketch')
        .in('skillid', Array.from(skillIds))
    : { data: [] as SkillRow[] }

  const skillById = new Map((skills || []).map((skill) => [Number(skill.skillid), skill]))

  const translationKeys = new Set<string>()
  for (const skill of skills || []) {
    collectSkillDesKeys(skill).forEach((key) => translationKeys.add(key))
  }

  const translations = await translateKeys(Array.from(translationKeys), lang)
  const getT = createTranslationGetter(translations, { lang })

  for (const card of cards) {
    const chunks: string[] = []
    const seen = new Set<string>()
    for (const skillId of cardSkillIds.get(card.id) || []) {
      const skill = skillById.get(skillId)
      if (!skill) continue

      for (const field of ['skill_des', 'skill_sketch'] as const) {
        for (const entry of normalizeDesValueList(skill[field])) {
          if (!entry.des) continue
          const plain = formatPlainLabel(getT(entry.des), entry.value ?? 0, {})
          if (!plain || seen.has(plain)) continue
          seen.add(plain)
          chunks.push(plain)
        }
      }
    }

    index.set(card.id, chunks.join(' '))
  }

  return index
}
