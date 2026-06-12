import { IMAGE_UNAVAILABLE, resolveAssetUrl } from '@/lib/assets/asset-registry'
import {
  iconPathFromPayload,
  parseInitialSkinId,
  type IconConfigPayload,
} from '@/lib/game/icon-config-payload'
import { convertHeroHeadIconPath } from '@/lib/game/resolve-hero-head-icon'
import { supabase } from '@/lib/supabase-client'

type RoleResourcesRow = {
  role_icon_all_path?: string | null
  role_icon_half_path?: string | null
  role_icon_bar_path?: string | null
}

export type HeroHeadIconEntry = {
  squarePath: string | null
  circlePath: string | null
  showCardPath: string | null
  halfCardPath: string | null
  barPath: string | null
  skinId: number | null
}

export type HeroHeadIconMap = Record<number, HeroHeadIconEntry>

export const EMPTY_HERO_HEAD_ICON_ENTRY: HeroHeadIconEntry = {
  skinId: null,
  squarePath: null,
  circlePath: null,
  showCardPath: null,
  halfCardPath: null,
  barPath: null,
}

function toManifestPath(rawPath?: string | null): string | null {
  if (!rawPath) return null
  const path = convertHeroHeadIconPath(rawPath)
  return path || null
}

function entryFromSources(
  payload: IconConfigPayload | null | undefined,
  skinId: number | null,
  resources?: RoleResourcesRow | null
): HeroHeadIconEntry {
  return {
    skinId,
    squarePath: toManifestPath(iconPathFromPayload(payload, 'role_square_icon_path')),
    circlePath: toManifestPath(iconPathFromPayload(payload, 'role_circle_icon_path')),
    showCardPath: toManifestPath(resources?.role_icon_all_path),
    halfCardPath: toManifestPath(resources?.role_icon_half_path),
    barPath: toManifestPath(resources?.role_icon_bar_path),
  }
}

function legacySquareHeadPath(heroId: number): string {
  return `/assets/resources/textures/hero/squareherohead/SquareHeroHead_${heroId}0.png`
}

function legacyCircleHeadPath(heroId: number): string {
  return `/assets/resources/textures/hero/circleherohead/CircleHeroHead_${heroId}0.png`
}

function firstAvailableUrl(paths: Array<string | null | undefined>, legacyPath: string): string {
  for (const path of paths) {
    if (!path) continue
    const resolved = resolveAssetUrl(path)
    if (resolved !== IMAGE_UNAVAILABLE) return resolved
  }
  return resolveAssetUrl(legacyPath)
}

/** Thumbnail / list — square head first (UISquareHeroItem). */
export function getHeroSquareHeadUrl(map: HeroHeadIconMap | undefined, heroId: number): string {
  const entry = map?.[heroId]
  return firstAvailableUrl(
    [entry?.squarePath, entry?.circlePath, entry?.barPath],
    legacySquareHeadPath(heroId)
  )
}

/** Bonds / circle avatars. */
export function getHeroCircleHeadUrl(map: HeroHeadIconMap | undefined, heroId: number): string {
  const entry = map?.[heroId]
  return firstAvailableUrl(
    [entry?.circlePath, entry?.squarePath, entry?.barPath],
    legacyCircleHeadPath(heroId)
  )
}

/** Single hero: RoleConfig → IconConfig + RoleResourcesConfig. */
export async function fetchHeroHeadIconEntry(heroId: number): Promise<HeroHeadIconEntry> {
  const { data: role, error: roleError } = await supabase
    .from('RoleConfig')
    .select('role_initial_skins')
    .eq('id', heroId)
    .maybeSingle()

  if (roleError) throw roleError

  const skinId = parseInitialSkinId(role?.role_initial_skins)
  if (skinId == null) return EMPTY_HERO_HEAD_ICON_ENTRY

  const [{ data: icon, error: iconError }, { data: resources, error: resourcesError }] =
    await Promise.all([
      supabase.from('IconConfig').select('payload').eq('id', skinId).maybeSingle(),
      supabase
        .from('RoleResourcesConfig')
        .select('role_icon_all_path, role_icon_half_path, role_icon_bar_path')
        .eq('id', skinId)
        .maybeSingle(),
    ])

  if (iconError) throw iconError
  if (resourcesError) throw resourcesError

  return entryFromSources(
    (icon?.payload ?? null) as IconConfigPayload | null,
    skinId,
    resources
  )
}

const ICON_CONFIG_BATCH_SIZE = 80

async function fetchIconConfigBySkinIds(skinIds: number[]): Promise<Map<number, IconConfigPayload>> {
  const payloadBySkin = new Map<number, IconConfigPayload>()
  if (skinIds.length === 0) return payloadBySkin

  for (let i = 0; i < skinIds.length; i += ICON_CONFIG_BATCH_SIZE) {
    const batch = skinIds.slice(i, i + ICON_CONFIG_BATCH_SIZE)
    const { data: icons, error: iconsError } = await supabase
      .from('IconConfig')
      .select('id, payload')
      .in('id', batch)

    if (iconsError) throw iconsError

    for (const row of icons ?? []) {
      if (row.id === '__format__') continue
      const skinId = Number(row.id)
      if (!Number.isFinite(skinId)) continue
      payloadBySkin.set(skinId, (row.payload ?? {}) as IconConfigPayload)
    }
  }

  return payloadBySkin
}

async function fetchRoleResourcesBySkinIds(
  skinIds: number[]
): Promise<Map<number, RoleResourcesRow>> {
  const bySkin = new Map<number, RoleResourcesRow>()
  if (skinIds.length === 0) return bySkin

  for (let i = 0; i < skinIds.length; i += ICON_CONFIG_BATCH_SIZE) {
    const batch = skinIds.slice(i, i + ICON_CONFIG_BATCH_SIZE)
    const { data: rows, error } = await supabase
      .from('RoleResourcesConfig')
      .select('id, role_icon_all_path, role_icon_half_path, role_icon_bar_path')
      .in('id', batch)

    if (error) throw error

    for (const row of rows ?? []) {
      const skinId = Number(row.id)
      if (!Number.isFinite(skinId)) continue
      bySkin.set(skinId, row)
    }
  }

  return bySkin
}

/** Loads head/card paths from RoleConfig.role_initial_skins → IconConfig + RoleResourcesConfig. */
export async function fetchHeroHeadIconMap(): Promise<HeroHeadIconMap> {
  const { data: roles, error: rolesError } = await supabase
    .from('RoleConfig')
    .select('id, role_initial_skins')
    .lte('id', 1499)

  if (rolesError) throw rolesError

  const skinByHero = new Map<number, number>()
  const skinIds = new Set<number>()

  for (const role of roles ?? []) {
    const heroId = Number(role.id)
    if (!Number.isFinite(heroId)) continue
    const skinId = parseInitialSkinId(role.role_initial_skins)
    if (skinId == null) continue
    skinByHero.set(heroId, skinId)
    skinIds.add(skinId)
  }

  if (skinIds.size === 0) return {}

  const skinIdList = [...skinIds]
  const [payloadBySkin, resourcesBySkin] = await Promise.all([
    fetchIconConfigBySkinIds(skinIdList),
    fetchRoleResourcesBySkinIds(skinIdList),
  ])

  const map: HeroHeadIconMap = {}
  for (const [heroId, skinId] of skinByHero) {
    map[heroId] = entryFromSources(
      payloadBySkin.get(skinId),
      skinId,
      resourcesBySkin.get(skinId)
    )
  }

  return map
}
