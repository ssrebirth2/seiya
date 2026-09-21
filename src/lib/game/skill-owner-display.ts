import { supabase } from '@/lib/supabase-client'
import {
  IMAGE_UNAVAILABLE,
  resolveArtifactListIcon,
  resolveCompanionListIcon,
  resolveForceCardListIcon,
  squareHeroHeadUrl,
} from '@/lib/assets/game-images'
import { translateKeys } from '@/lib/i18n/language-package'
import { ownerHref, type SkillOwner, type SkillOwnerType } from '@/lib/game/skill-owners'

export type SkillOwnerDisplay = {
  type: SkillOwnerType
  id: number
  name: string
  iconUrl: string
  href?: string
}

export function ownerDisplayKey(owner: Pick<SkillOwner, 'type' | 'id'>): string {
  return `${owner.type}:${owner.id}`
}

const CATALOG_THUMB_TYPES = new Set<SkillOwnerType>(['hero', 'force_card', 'artifact', 'spirit'])
const IN_CHUNK = 200

async function fetchInChunks<T extends Record<string, unknown>>(
  table: string,
  columns: string,
  ids: number[]
): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK)
    const { data, error } = await supabase.from(table).select(columns).in('id', chunk)
    if (error) {
      console.warn(`[skill-owner-display] ${table}: ${error.message}`)
      continue
    }
    out.push(...((data || []) as unknown as T[]))
  }
  return out
}

/** Owners worth showing as thumbs on catalog cards. */
export function catalogOwnersForThumbs(owners: SkillOwner[], limit = 3): SkillOwner[] {
  return owners.filter((o) => CATALOG_THUMB_TYPES.has(o.type)).slice(0, limit)
}

/**
 * Batch-resolve names + icons for skill owners (list + detail).
 */
export async function loadSkillOwnerDisplayMap(
  owners: SkillOwner[],
  lang: string
): Promise<Map<string, SkillOwnerDisplay>> {
  const map = new Map<string, SkillOwnerDisplay>()
  if (!owners.length) return map

  const byType = {
    hero: new Set<number>(),
    force_card: new Set<number>(),
    artifact: new Set<number>(),
    spirit: new Set<number>(),
    npc: new Set<number>(),
    system: new Set<number>(),
  }
  for (const o of owners) {
    if (byType[o.type]) byType[o.type].add(o.id)
  }

  const nameKeys = new Set<string>()
  const heroNameById = new Map<number, string>()
  const cardNameById = new Map<number, string>()
  const artifactNameById = new Map<number, string>()
  const spiritNameById = new Map<number, string>()
  const artifactIconById = new Map<number, string>()
  const spiritIconById = new Map<number, string>()
  const cardHasIcon = new Set<number>()

  if (byType.hero.size) {
    const rows = await fetchInChunks<{ id: number; role_name?: string }>(
      'RoleResourcesConfig',
      'id, role_name',
      [...byType.hero]
    )
    for (const row of rows) {
      const id = Number(row.id)
      if (typeof row.role_name === 'string' && row.role_name) {
        heroNameById.set(id, row.role_name)
        nameKeys.add(row.role_name)
      }
    }
  }

  if (byType.force_card.size) {
    const rows = await fetchInChunks<{
      id: number
      name?: string
      icon_samll_path?: string | null
    }>('ForceCardItemConfig', 'id, name, icon_samll_path', [...byType.force_card])
    for (const row of rows) {
      const id = Number(row.id)
      if (typeof row.name === 'string' && row.name) {
        cardNameById.set(id, row.name)
        nameKeys.add(row.name)
      }
      if (row.icon_samll_path) cardHasIcon.add(id)
    }
  }

  if (byType.artifact.size) {
    const ids = [...byType.artifact]
    const [arts, res] = await Promise.all([
      fetchInChunks<{ id: number; name?: string }>('ArtifactConfig', 'id, name', ids),
      fetchInChunks<{ id: number; item_icon?: string | null }>(
        'ArtifactResourcesConfig',
        'id, item_icon',
        ids
      ),
    ])
    for (const row of arts) {
      const id = Number(row.id)
      if (typeof row.name === 'string' && row.name) {
        artifactNameById.set(id, row.name)
        nameKeys.add(row.name)
      }
    }
    for (const row of res) {
      if (row.item_icon) artifactIconById.set(Number(row.id), row.item_icon)
    }
  }

  if (byType.spirit.size) {
    const spirits = await fetchInChunks<{ id: number; name?: string; skins?: number }>(
      'SpiritConfig',
      'id, name, skins',
      [...byType.spirit]
    )
    const skinIds = new Set<number>()
    const spiritSkin = new Map<number, number>()
    for (const row of spirits) {
      const id = Number(row.id)
      if (typeof row.name === 'string' && row.name) {
        spiritNameById.set(id, row.name)
        nameKeys.add(row.name)
      }
      const skin = Number(row.skins)
      if (Number.isFinite(skin) && skin > 0) {
        spiritSkin.set(id, skin)
        skinIds.add(skin)
      }
    }
    if (skinIds.size) {
      const res = await fetchInChunks<{ id: number; item_icon?: string | null }>(
        'ArtifactResourcesConfig',
        'id, item_icon',
        [...skinIds]
      )
      const iconBySkin = new Map<number, string>()
      for (const row of res) {
        if (row.item_icon) iconBySkin.set(Number(row.id), row.item_icon)
      }
      for (const [spiritId, skin] of spiritSkin) {
        const icon = iconBySkin.get(skin)
        if (icon) spiritIconById.set(spiritId, icon)
      }
    }
  }

  const tmap = nameKeys.size ? await translateKeys([...nameKeys], lang) : {}

  const resolveName = (key: string | undefined, fallback: string) => {
    if (!key) return fallback
    const resolved = tmap[key]
    if (resolved && resolved.trim() && !resolved.startsWith('LC_')) return resolved
    return fallback
  }

  for (const owner of owners) {
    const key = ownerDisplayKey(owner)
    if (map.has(key)) continue
    const fallback = `#${owner.id}`
    let name = fallback
    let iconUrl = IMAGE_UNAVAILABLE

    switch (owner.type) {
      case 'hero': {
        name = resolveName(heroNameById.get(owner.id), fallback)
        iconUrl = squareHeroHeadUrl(owner.id)
        break
      }
      case 'force_card': {
        name = resolveName(cardNameById.get(owner.id), fallback)
        iconUrl = resolveForceCardListIcon(owner.id, true).src
        break
      }
      case 'artifact': {
        name = resolveName(artifactNameById.get(owner.id), fallback)
        iconUrl = resolveArtifactListIcon(artifactIconById.get(owner.id)).src
        break
      }
      case 'spirit': {
        name = resolveName(spiritNameById.get(owner.id), fallback)
        iconUrl = resolveCompanionListIcon(spiritIconById.get(owner.id)).src
        break
      }
      default:
        name = fallback
        iconUrl = IMAGE_UNAVAILABLE
    }

    map.set(key, {
      type: owner.type,
      id: owner.id,
      name,
      iconUrl,
      href: ownerHref(owner),
    })
  }

  return map
}

/** Unique owners across skill rows (for batch list loading). */
export function collectUniqueOwners(
  ownerLists: SkillOwner[][],
  types?: Set<SkillOwnerType>
): SkillOwner[] {
  const seen = new Set<string>()
  const out: SkillOwner[] = []
  for (const list of ownerLists) {
    for (const o of list) {
      if (types && !types.has(o.type)) continue
      const k = ownerDisplayKey(o)
      if (seen.has(k)) continue
      seen.add(k)
      out.push(o)
    }
  }
  return out
}

/** First force-card owner with resolved display (name/icon). */
export function firstForceCardOwnerDisplay(
  owners: SkillOwner[],
  displayMap: Map<string, SkillOwnerDisplay>
): SkillOwnerDisplay | undefined {
  for (const owner of owners) {
    if (owner.type !== 'force_card') continue
    const display = displayMap.get(ownerDisplayKey(owner))
    if (display) return display
  }
  return undefined
}
