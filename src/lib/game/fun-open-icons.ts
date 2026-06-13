/**
 * FunOpen navigation icons — from FunOpenResourcesConfig.get_path_icon (LoadTextureE).
 * Native size: 128×128 px (verified from action_artifact.assetbundle).
 */

export const FUN_OPEN_ICON_NATIVE_SIZE = 128

/** FunOpenResourcesConfig id → game texture path (field get_path_icon). */
export const FUN_OPEN_IDS = {
  home: 10016,
  gallery: 10011,
  bag: 10052,
  heroes: 10040,
  artifacts: 10043,
  companions: 10087,
  forceCards: 10071,
  teamBuilder: 10054,
  tools: 10076,
} as const

export type FunOpenIconKey =
  | 'home'
  | 'gallery'
  | 'bag'
  | 'heroes'
  | 'artifacts'
  | 'companions'
  | 'forceCards'
  | 'teamBuilder'
  | 'tools'
  | 'menu'

/** Lua get_path_icon values mirrored under public/assets/resources/textures/levelup/ */
const GAME_TEXTURE_PATH: Record<FunOpenIconKey, string> = {
  home: 'Textures/LevelUp/Action_home',
  gallery: 'Textures/LevelUp/Action_gallery',
  bag: 'Textures/LevelUp/Action_bag',
  heroes: 'Textures/LevelUp/Action_hero',
  artifacts: 'Textures/LevelUp/Action_artifact',
  companions: 'Textures/LevelUp/Action_yuanling',
  forceCards: 'Textures/LevelUp/Action_force_card',
  teamBuilder: 'Textures/LevelUp/Action_quickly_set',
  tools: 'Textures/LevelUp/Action_reductionHelper',
  menu: 'Textures/LevelUp/Action_function_7',
}

export function gameTextureToPublicPath(gamePath: string): string {
  const rel = gamePath.replace(/\\/g, '/').replace(/^Textures\//i, 'textures/').toLowerCase()
  return `/assets/resources/${rel}.png`
}

export function getFunOpenIconPath(key: FunOpenIconKey): string {
  return gameTextureToPublicPath(GAME_TEXTURE_PATH[key])
}

export const SITE_NAV_ICONS = {
  '/': 'home',
  '/heroes': 'heroes',
  '/artifacts': 'artifacts',
  '/companions': 'companions',
  '/force-cards': 'forceCards',
  '/items': 'bag',
  '/team-builder': 'teamBuilder',
} as const satisfies Record<string, FunOpenIconKey>

export function iconKeyForHref(href: string): FunOpenIconKey | undefined {
  if (href in SITE_NAV_ICONS) return SITE_NAV_ICONS[href as keyof typeof SITE_NAV_ICONS]
  for (const [route, key] of Object.entries(SITE_NAV_ICONS)) {
    if (route !== '/' && href.startsWith(`${route}/`)) return key
  }
  return undefined
}
