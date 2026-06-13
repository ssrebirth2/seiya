/**
 * Sprite paths mirroring HeroUtil.lua (name + atlas from LoadSpriteE second argument).
 *
 * Reference:
 *   C:\rb2\assets\resources\luascriptwithoutcodecomments\game\gameutils\HeroUtil.lua
 *   UISquareHeroItem.lua — SetQualityActive activates @_obj_qualitymask + @_aorimage_quality (ck_icon_*)
 */
import { isAssetAvailable } from '@/lib/assets/asset-registry'
import { getSiteLanguageBundleLang } from '@/lib/i18n/site-languages'

const QUALITY_ICON = [
  '',
  'ck_icon_n',
  'ck_icon_r',
  'ck_icon_sr',
  'ck_icon_ssr',
  'ck_icon_ur',
  'ck_icon_UR_1s',
  'ck_icon_UR_2s',
  'ck_icon_UR_3s',
  'ck_icon_UR_4s',
  'ck_icon_UR_5s',
  'ck_icon_UR_6s',
  'ck_icon_UR_7s',
  'ck_icon_UR_8s',
  'ck_icon_UR_9s',
  'ck_icon_UR_10s',
  'ck_icon_UR_11s',
  'ck_icon_UR_12s',
  'ck_icon_UR_13s',
  'ck_icon_UR_14s',
  'ck_icon_UR_15s',
  'ck_icon_UR_16s',
  'ck_icon_UR_17s',
  'ck_icon_UR_18s',
  'ck_icon_UR_19s',
  'ck_icon_UR_20s',
] as const

const QUALITY_ORIGINAL_ICON = [
  '',
  'ck_icon_n',
  'ck_icon_r',
  'ck_icon_sp_SR',
  'ck_icon_sp_SSR',
  'ck_icon_sp_UR',
] as const

const CAMP_ICON: Array<[string, GameAtlasPath]> = [
  ['', 'UI/Sprites/Common'],
  ['js_icon_zhenying_1', 'UI/Sprites/Common'],
  ['js_icon_zhenying_2', 'UI/Sprites/Common'],
  ['js_icon_zhenying_3', 'UI/Sprites/Common'],
  ['js_icon_zhenying_4', 'UI/Sprites/Common'],
  ['js_icon_zhenying_5', 'UI/Sprites/Common'],
]

const POSITION_ICON: Array<[string, GameAtlasPath]> = [
  ['', 'UI/Sprites/LanguageRes/{0}/Common'],
  ['js_icon_zhanwei_1', 'UI/Sprites/LanguageRes/{0}/Common'],
  ['js_icon_zhanwei_2', 'UI/Sprites/LanguageRes/{0}/Common'],
  ['js_icon_zhanwei_3', 'UI/Sprites/LanguageRes/{0}/Common'],
]

const ATTACK_TYPE_ICON: Array<[string, GameAtlasPath]> = [
  ['', 'UI/Sprites/Common'],
  ['js_icon_shanghaileixing_1', 'UI/Sprites/Common'],
  ['js_icon_shanghaileixing_2', 'UI/Sprites/Common'],
  ['js_icon_shanghaileixing_3', 'UI/Sprites/Common'],
]

export type GameAtlasPath =
  | 'UI/Sprites/Common'
  | 'UI/Sprites/CommonHero'
  | 'UI/Sprites/LanguageRes/{0}/Common'

/** Maps HeroUtil / GameDefine.SpritesPath → public folder segment. */
export function gameAtlasToFolder(atlas: GameAtlasPath, lang?: string): string {
  switch (atlas) {
    case 'UI/Sprites/CommonHero':
      return 'commonhero'
    case 'UI/Sprites/LanguageRes/{0}/Common':
      return `languageres/${getSiteLanguageBundleLang(lang)}/common`
    case 'UI/Sprites/Common':
    default:
      return 'common'
  }
}

export function spriteManifestPath(
  spriteName: string,
  atlas: GameAtlasPath,
  lang?: string
): string {
  const folder = gameAtlasToFolder(atlas, lang)
  return `/assets/resources/ui/sprites/${folder}/${spriteName}.png`
}

export function isSpriteAvailable(
  spriteName: string,
  atlas: GameAtlasPath,
  lang?: string
): boolean {
  if (!spriteName) return false
  return isAssetAvailable(spriteManifestPath(spriteName, atlas, lang))
}

export function getCampIconRef(camp: number): { name: string; atlas: GameAtlasPath } | null {
  const row = CAMP_ICON[camp]
  if (!row || !row[0]) return null
  return { name: row[0], atlas: row[1] }
}

export function getCampIconPath(camp: number): string {
  const ref = getCampIconRef(camp)
  return ref ? spriteManifestPath(ref.name, ref.atlas) : ''
}

export function getPositionIconPath(position: number, lang?: string): string {
  const row = POSITION_ICON[position]
  if (!row || !row[0]) return ''
  return spriteManifestPath(row[0], row[1], lang)
}

/** Filter panel "All" toggle — js_icon_zhanwei_0 (LanguageRes). */
export function getFilterAllIconPath(lang?: string): string {
  return spriteManifestPath('js_icon_zhanwei_0', 'UI/Sprites/LanguageRes/{0}/Common', lang)
}

export function getAttackTypeIconRef(
  attackType: number
): { name: string; atlas: GameAtlasPath } | null {
  const row = ATTACK_TYPE_ICON[attackType]
  if (!row || !row[0]) return null
  return { name: row[0], atlas: row[1] }
}

export function getAttackTypeIconPath(attackType: number): string {
  const ref = getAttackTypeIconRef(attackType)
  return ref ? spriteManifestPath(ref.name, ref.atlas) : ''
}

export function getOccupationIconRef(
  occupation: number
): { name: string; atlas: GameAtlasPath } | null {
  if (occupation <= 0 || occupation > 5) return null
  return {
    name: `js_icon_zongshuxing_${occupation}`,
    atlas: 'UI/Sprites/CommonHero',
  }
}

export function getOccupationIconPath(occupation: number): string {
  const ref = getOccupationIconRef(occupation)
  return ref ? spriteManifestPath(ref.name, ref.atlas) : ''
}

/** ck_icon_r atlas art is ~20% larger than other tier badges — normalize in CSS via .quality-icon--r */
export const QUALITY_ICON_R_NAME = 'ck_icon_r'
export const QUALITY_ICON_R_DISPLAY_SCALE = 0.8

function resolveQualityIconName(quality: number, heroBaseQuality?: number): string {
  if (quality <= 0) return ''
  const capped = Math.min(quality, QUALITY_ICON.length - 1)
  const useOriginal =
    heroBaseQuality != null &&
    heroBaseQuality === quality &&
    quality >= 3 &&
    quality <= 5
  return useOriginal
    ? (QUALITY_ORIGINAL_ICON[quality] ?? QUALITY_ICON[capped])
    : (QUALITY_ICON[capped] ?? '')
}

/** UISquareHeroItem:SetQuality + HeroUtil.GetQualityIcon */
export function getQualityIconPath(quality: number, heroBaseQuality?: number): string {
  const name = resolveQualityIconName(quality, heroBaseQuality)
  if (!name) return ''
  return spriteManifestPath(name, 'UI/Sprites/Common')
}

/** Apply wherever getQualityIconPath resolves to ck_icon_r. */
export function getQualityIconClassName(quality: number, heroBaseQuality?: number): string {
  return resolveQualityIconName(quality, heroBaseQuality) === QUALITY_ICON_R_NAME
    ? 'quality-icon--r'
    : ''
}

/** @_aorimage_bg — SkyRoamExploreingAndExploredView mBg:LoadSpriteE("dstxk_box_1") */
export function getSquareHeroBgFramePath(): string {
  return spriteManifestPath('dstxk_box_1', 'UI/Sprites/Common')
}

export type SquareHeroTypeIcons = {
  position: string
  damageType: string
  camp: string
  defenseType?: string
}

/** UISquareHeroItem:SetData — damagetype 3 uses alternate camp/damage layout */
export function getSquareHeroTypeIcons(
  damagetype: number,
  stance: number,
  camp: number,
  lang?: string
): SquareHeroTypeIcons {
  const position = getPositionIconPath(stance, lang)

  if (damagetype !== 3) {
    return {
      position,
      damageType: getAttackTypeIconPath(damagetype),
      camp: getCampIconPath(camp),
    }
  }

  return {
    position,
    damageType: getAttackTypeIconPath(damagetype - 2),
    camp: getAttackTypeIconPath(damagetype - 1),
    defenseType: getCampIconPath(camp),
  }
}

export const STAR_ICON = 'xx_icon_star_liang'
export const AWAKEN_STAR_ICON = 'dsjx_icon_xingxing'

export function getStarIconPath(): string {
  return spriteManifestPath(STAR_ICON, 'UI/Sprites/Common')
}

export function getAwakenStarIconPath(): string {
  return spriteManifestPath(AWAKEN_STAR_ICON, 'UI/Sprites/Common')
}
