import { supabase } from '@/lib/supabase-client'
import { normalizeDesValueList, parsePrimitiveList } from '@/lib/game/parse-game-data'
import { skillTypeLcKey } from '@/lib/game/format-skill-labels'
import {
  bandForSkill,
  classifySkillCatalogLayer,
  classifySkillCompleteness,
  skillDisplayDesPreview,
  skillDisplayIconUrl,
  skillDisplayName,
  type SkillCatalogLayer,
  type SkillCompleteness,
  type SkillCompletenessFlags,
  type SkillConfigRow,
  type SkillDisplayCopy,
} from '@/lib/game/skill-completeness'
import {
  getHeroSkillSlot,
  type SkillIdBand,
  SKILL_BAND_LABEL_KEYS,
} from '@/lib/game/skill-id-band'
import {
  buildSkillOwnerIndex,
  collectHeroAwakenAddSkillIds,
  type SkillOwner,
  type SkillOwnerType,
} from '@/lib/game/skill-owners'
import { skillMatchesTagFilter } from '@/lib/game/skill-tag-filter'
import { synthesizeAwakenSkillStub } from '@/lib/game/synthesize-awaken-skill-stub'

export const SKILL_CATALOG_PAGE_SIZE = 48

export type SkillCatalogRow = {
  skillid: number
  nameKey: string | null
  iconpath: string | null
  skillType: number | null
  labelIds: number[]
  /** Feature link ids from `<link=ID>` in skill texts (filled after translations load). */
  featureIds: number[]
  band: SkillIdBand
  heroSlot: number | null
  owners: SkillOwner[]
  ownerKinds: SkillOwnerType[]
  flags: SkillCompletenessFlags
  layer: SkillCatalogLayer
  completeness: SkillCompleteness
  iconUrl: string
  raw: SkillConfigRow
}

const SKILL_COLUMNS =
  'skillid, name, iconpath, skill_type, cd, label_list, sub_skills, skill_des, skill_sketch, awaken_skill_des, skill_quality, skill_condition'

const PAGE = 1000

async function fetchAllSkills(): Promise<SkillConfigRow[]> {
  const rows: SkillConfigRow[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('SkillConfig')
      .select(SKILL_COLUMNS)
      .order('skillid')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`SkillConfig: ${error.message}`)
    const batch = (data || []) as SkillConfigRow[]
    rows.push(...batch)
    if (batch.length < PAGE) break
    from += PAGE
  }
  return rows
}

export async function loadSkillCatalog(): Promise<{
  rows: SkillCatalogRow[]
  labels: { id: number; nameKey: string }[]
}> {
  const [skillsRaw, labelResult, awakenAddSkillIds] = await Promise.all([
    fetchAllSkills(),
    supabase.from('SkillLabelConfig').select('id, name').order('id'),
    collectHeroAwakenAddSkillIds(),
  ])

  // Awaken add_skill ids can be missing from SkillConfig (e.g. 61180) — synthesize stubs.
  const skills = [...skillsRaw]
  const existingIds = new Set(skills.map((s) => Number(s.skillid)))
  for (const skillId of awakenAddSkillIds) {
    if (!existingIds.has(skillId)) {
      skills.push(synthesizeAwakenSkillStub(skillId))
      existingIds.add(skillId)
    }
  }

  const subSkillsById = new Map<number, number[]>()
  for (const skill of skills) {
    const id = Number(skill.skillid)
    const subs = parsePrimitiveList(skill.sub_skills)
      .map(Number)
      .filter(Number.isFinite)
    if (subs.length) subSkillsById.set(id, subs)
  }

  const ownerIndex = await buildSkillOwnerIndex(subSkillsById)

  const labels = ((labelResult.data || []) as { id: number; name?: string }[])
    .map((r) => ({
      id: Number(r.id),
      nameKey: typeof r.name === 'string' ? r.name : '',
    }))
    .filter((r) => Number.isFinite(r.id) && r.nameKey)

  const rows: SkillCatalogRow[] = skills.map((skill) => {
    const skillid = Number(skill.skillid)
    const owners = ownerIndex.get(skillid) ?? []
    const flags = classifySkillCompleteness(skill)
    const layer = classifySkillCatalogLayer(skill, owners, flags)
    const ownerKinds = [...new Set(owners.map((o) => o.type))]

    return {
      skillid,
      nameKey: typeof skill.name === 'string' ? skill.name : null,
      iconpath: typeof skill.iconpath === 'string' ? skill.iconpath : null,
      skillType: skill.skill_type != null ? Number(skill.skill_type) : null,
      labelIds: parsePrimitiveList(skill.label_list).map(Number).filter(Number.isFinite),
      featureIds: [],
      band: bandForSkill(skillid),
      heroSlot: getHeroSkillSlot(skillid),
      owners,
      ownerKinds,
      flags,
      layer,
      completeness: flags.completeness,
      iconUrl: skillDisplayIconUrl(skill),
      raw: skill,
    }
  })

  // Only expose tags that appear on at least one visible catalog skill.
  const usedLabelIds = new Set<number>()
  for (const row of rows) {
    if (row.layer === 'hidden') continue
    for (const id of row.labelIds) usedLabelIds.add(id)
  }
  const visibleLabels = labels.filter((l) => usedLabelIds.has(l.id))

  return { rows, labels: visibleLabels }
}

export type SkillCatalogFilters = {
  search: string
  skillType: string
  /** Encoded tag filter (`l12|f3`) — labels and/or feature links. */
  tag: string
  band: string
  sortBy: 'id' | 'name' | 'type'
}

export function filterSkillCatalog(
  rows: SkillCatalogRow[],
  filters: SkillCatalogFilters,
  getT: (key?: string) => string,
  copy: SkillDisplayCopy,
  ownerDisplayMap?: Map<string, { name: string }>
): SkillCatalogRow[] {
  const q = filters.search.trim().toLowerCase()

  let result = rows.filter((row) => {
    // Auto-attack stubs and other hidden layers never appear in the catalog.
    if (row.layer === 'hidden') return false

    if (filters.skillType && String(row.skillType ?? '') !== filters.skillType) return false
    if (filters.tag && !skillMatchesTagFilter(row, filters.tag)) return false
    if (filters.band && row.band !== filters.band) return false

    if (q) {
      const name = skillDisplayName(row.raw, getT, copy)
      const des = skillDisplayDesPreview(row.raw, getT, copy)
      const idMatch = String(row.skillid).includes(q)
      const nameMatch = !name.isPlaceholder && name.text.toLowerCase().includes(q)
      const desMatch = !des.isPlaceholder && des.text.toLowerCase().includes(q)
      const labelMatch = row.labelIds.some((lid) =>
        getT(`LC_SKILL_label_${lid}`).toLowerCase().includes(q)
      )
      const ownerMatch = Boolean(
        ownerDisplayMap &&
          row.owners.some((o) => {
            const d = ownerDisplayMap.get(`${o.type}:${o.id}`)
            return d?.name && !d.name.startsWith('#') && d.name.toLowerCase().includes(q)
          })
      )
      if (!idMatch && !nameMatch && !desMatch && !labelMatch && !ownerMatch) return false
    }

    return true
  })

  result = [...result].sort((a, b) => {
    switch (filters.sortBy) {
      case 'name': {
        const resolveSortName = (row: SkillCatalogRow) => {
          if (ownerDisplayMap && row.band === 'force_card') {
            for (const o of row.owners) {
              if (o.type !== 'force_card') continue
              const d = ownerDisplayMap.get(`${o.type}:${o.id}`)
              if (d?.name && !d.name.startsWith('#')) return d.name
            }
          }
          return skillDisplayName(row.raw, getT, copy).text
        }
        const an = resolveSortName(a)
        const bn = resolveSortName(b)
        return an.localeCompare(bn) || a.skillid - b.skillid
      }
      case 'type':
        return (a.skillType ?? 99) - (b.skillType ?? 99) || a.skillid - b.skillid
      case 'id':
      default:
        return a.skillid - b.skillid
    }
  })

  return result
}

export function collectSkillCatalogLcKeys(
  rows: SkillCatalogRow[],
  labels: { id: number; nameKey: string }[]
): string[] {
  const keys = new Set<string>()
  for (const label of labels) {
    if (label.nameKey) keys.add(label.nameKey)
  }
  for (let t = 1; t <= 9; t++) {
    const k = skillTypeLcKey(t)
    if (k) keys.add(k)
  }
  for (const row of rows) {
    if (row.nameKey) keys.add(row.nameKey)
    for (const lid of row.labelIds) keys.add(`LC_SKILL_label_${lid}`)
    const typeKey = skillTypeLcKey(row.skillType)
    if (typeKey) keys.add(typeKey)
    // First des + sketch only — enough for card preview / tag-link discovery without
    // fetching every ascension LC key up front (keeps skills page responsive).
    if (row.layer === 'catalog' || row.layer === 'sneakPeek') {
      const firstDes = normalizeDesValueList(row.raw.skill_des)[0]
      if (firstDes?.des) keys.add(firstDes.des)
      const firstSketch = normalizeDesValueList(row.raw.skill_sketch)[0]
      if (firstSketch?.des) keys.add(firstSketch.des)
      const firstAwaken = normalizeDesValueList(row.raw.awaken_skill_des)[0]
      if (firstAwaken?.des) keys.add(firstAwaken.des)
    }
  }
  return [...keys]
}

export { SKILL_BAND_LABEL_KEYS }
export type { SkillIdBand, SkillCatalogLayer, SkillCompleteness, SkillDisplayCopy }
