import { IMAGE_UNAVAILABLE, resolveAssetUrl } from '@/lib/assets/asset-registry'
import {
  iconPathFromPayload,
  parseInitialSkinId,
  type IconConfigPayload,
} from '@/lib/game/icon-config-payload'
import {
  clothFigureSidFromClothId,
  roleFigureSidFromHeroId,
} from '@/lib/game/figure-ref'
import { parseFigureAttributePayload } from '@/lib/game/parse-figure-attribute-payload'
import { loadConsumeRefMap } from '@/lib/game/load-consume-ref-map'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import {
  parseClothConfigPayload,
  parseClothPartPayload,
  parseGalleryClothInfoPayload,
  type ClothPartParsed,
} from '@/lib/game/parse-cloth-payload'
import {
  normalizeConsumeList,
  normalizeSkillRefList,
  parseGameData,
  parsePrimitiveList,
  type ConsumeEntry,
} from '@/lib/game/parse-game-data'
import { parseHeroStarUpPayload, type HeroStarUpStep } from '@/lib/game/parse-hero-star-payload'
import { convertHeroHeadIconPath } from '@/lib/game/resolve-hero-head-icon'
import { itemIconUrl } from '@/lib/game/resolve-item-icon'
import { translateKeys } from '@/lib/i18n/language-package'
import { supabase } from '@/lib/supabase-client'
import { isHeroListed } from '@/lib/game/hidden-hero-ids'

export type HeroOverviewSkin = {
  skinId: number
  squarePath: string | null
  squareUrl: string
  /** LC key from RoleResourcesConfig.role_name (HeroSkinData:GetSkinName). */
  nameKey: string | null
  isDefault: boolean
}

export type HeroOverviewClothPart = {
  id: number
  pos: number
  path: string | null
  iconUrl: string
}

export type HeroOverviewCloth = {
  clothId: number
  nameKey: string | null
  descKey: string | null
  showIconPath: string | null
  showIconUrl: string
  parts: HeroOverviewClothPart[]
}

export type HeroOverviewFigure = {
  sid: number
  kind: 'role' | 'cloth'
  nameKey: string | null
  descKey: string | null
  figurePath: string | null
  figureUrl: string
  iconPath: string | null
  iconUrl: string
  quality: number | null
}

export type HeroOverviewStarStep = HeroStarUpStep & {
  starLevel: number
  materials: ConsumeEntry[]
}

export type HeroOverviewAwakenStep = {
  id: number
  awakenLevel: number
  consume: ConsumeEntry[]
  addSkill: ReturnType<typeof normalizeSkillRefList>
}

export type HeroOverviewBundle = {
  heroId: number
  roleIntroduction: string | null
  roleFeatures: string | null
  cloth: HeroOverviewCloth | null
  figures: HeroOverviewFigure[]
  skins: HeroOverviewSkin[]
  starSteps: HeroOverviewStarStep[]
  awakenSteps: HeroOverviewAwakenStep[]
  consumeRefMap: ConsumeRefMap
  translations: Record<string, string>
}

function textureUrl(dbPath: string | null | undefined): string {
  if (!dbPath) return IMAGE_UNAVAILABLE
  return resolveAssetUrl(itemIconUrl(dbPath))
}

async function fetchPayloadRows(table: string, ids: number[]): Promise<Map<number, unknown>> {
  const map = new Map<number, unknown>()
  if (!ids.length) return map
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const { data } = await supabase.from(table).select('id, payload').in('id', chunk)
    for (const row of data ?? []) {
      map.set(Number(row.id), row.payload)
    }
  }
  return map
}

async function loadClothBlock(clothId: number): Promise<{
  cloth: HeroOverviewCloth | null
  lcKeys: string[]
}> {
  const lcKeys: string[] = []
  const { data: clothRow } = await supabase
    .from('ClothConfig')
    .select('id, payload')
    .eq('id', clothId)
    .maybeSingle()

  if (!clothRow?.payload) return { cloth: null, lcKeys }

  const parsed = parseClothConfigPayload(clothRow.payload, clothId)
  if (parsed.clothNameKey) lcKeys.push(parsed.clothNameKey)

  let galleryName = parsed.clothNameKey
  let galleryDesc: string | null = null
  const { data: galleryRow } = await supabase
    .from('GalleryClothInfoConfig')
    .select('id, payload')
    .eq('id', clothId)
    .maybeSingle()
  if (galleryRow?.payload) {
    const gallery = parseGalleryClothInfoPayload(galleryRow.payload, clothId)
    if (gallery.nameKey) {
      galleryName = gallery.nameKey
      lcKeys.push(gallery.nameKey)
    }
    if (gallery.descKey) {
      galleryDesc = gallery.descKey
      lcKeys.push(gallery.descKey)
    }
  }

  const partPayloads = await fetchPayloadRows('ClothPartConfig', parsed.partIds)
  const parts: ClothPartParsed[] = parsed.partIds
    .map((pid) => {
      const payload = partPayloads.get(pid)
      return payload != null ? parseClothPartPayload(payload, pid) : null
    })
    .filter((p): p is ClothPartParsed => p != null)
    .sort((a, b) => a.pos - b.pos)

  return {
    cloth: {
      clothId: parsed.clothId || clothId,
      nameKey: galleryName,
      descKey: galleryDesc,
      showIconPath: parsed.showIconPath,
      showIconUrl: textureUrl(parsed.showIconPath),
      parts: parts.map((p) => ({
        id: p.id,
        pos: p.pos,
        path: p.path,
        iconUrl: textureUrl(p.path),
      })),
    },
    lcKeys,
  }
}

async function loadFigures(
  heroId: number,
  clothId: number | null,
  clothNameKey: string | null,
  clothDescKey: string | null,
  roleIntroduction: string | null
): Promise<{ figures: HeroOverviewFigure[]; lcKeys: string[] }> {
  const lcKeys: string[] = []
  const figures: HeroOverviewFigure[] = []

  const roleSid = roleFigureSidFromHeroId(heroId)
  const clothSid = clothId != null ? clothFigureSidFromClothId(clothId) : null
  const sids = [roleSid, ...(clothSid != null ? [clothSid] : [])]

  type FigRow = ReturnType<typeof parseFigureAttributePayload>

  let byHero: FigRow | null = null
  let byIds: FigRow[] = []

  const idsRes = await supabase
    .from('FigureAttributeConfig')
    .select('id, payload')
    .in(
      'id',
      sids.map((id) => String(id))
    )
  if (!idsRes.error) {
    byIds = (idsRes.data ?? []).map((row) =>
      parseFigureAttributePayload(
        (row as { payload: unknown }).payload,
        Number((row as { id: string | number }).id)
      )
    )
  }

  // Role figures: prefer id_hero match when present in fetched sids; also scan nearby role sid.
  byHero = byIds.find((r) => r.idHero === heroId) ?? null
  if (!byHero) {
    const roleRes = await supabase
      .from('FigureAttributeConfig')
      .select('id, payload')
      .eq('id', String(roleSid))
      .maybeSingle()
    if (!roleRes.error && roleRes.data) {
      byHero = parseFigureAttributePayload(
        (roleRes.data as { payload: unknown }).payload,
        roleSid
      )
    }
  }

  const byId = new Map(byIds.map((r) => [r.id, r]))
  if (byHero) byId.set(byHero.id, byHero)

  const pushFigure = (
    kind: 'role' | 'cloth',
    sid: number,
    row: FigRow | null,
    fallbackFigurePath: string,
    fallbackName: string | null,
    fallbackDesc: string | null
  ) => {
    const nameKey = row?.name ?? fallbackName
    const descKey = row?.desc ?? fallbackDesc
    if (nameKey) lcKeys.push(nameKey)
    if (descKey) lcKeys.push(descKey)
    const figurePath = row?.figurePath ?? fallbackFigurePath
    const iconPath = row?.iconPath ?? null
    figures.push({
      sid,
      kind,
      nameKey,
      descKey,
      figurePath,
      figureUrl: textureUrl(figurePath),
      iconPath,
      iconUrl: textureUrl(iconPath),
      quality: row?.figureInitialQuality ?? null,
    })
  }

  // FigureAttributeConfig.name for role figures is LC_ROLE_role_full_name_{heroId}
  const roleNameFallback = `LC_ROLE_role_full_name_${heroId}`
  pushFigure(
    'role',
    roleSid,
    byId.get(roleSid) ?? byHero ?? null,
    `Textures/Figure/Role/RoleIcon_${heroId}`,
    roleNameFallback,
    roleIntroduction
  )
  if (clothSid != null && clothId != null) {
    pushFigure(
      'cloth',
      clothSid,
      byId.get(clothSid) ?? null,
      `Textures/Figure/Cloth/ClothIcon_${clothId}`,
      clothNameKey,
      clothDescKey
    )
  }

  return { figures, lcKeys }
}

async function loadSkins(heroId: number): Promise<{
  skins: HeroOverviewSkin[]
  roleIntroduction: string | null
  roleFeatures: string | null
  lcKeys: string[]
}> {
  const lcKeys: string[] = []
  const { data: role } = await supabase
    .from('RoleConfig')
    .select('role_skins, role_initial_skins, role_introduction, role_features')
    .eq('id', heroId)
    .maybeSingle()

  const roleIntroduction =
    typeof role?.role_introduction === 'string' ? role.role_introduction : null
  const roleFeatures = typeof role?.role_features === 'string' ? role.role_features : null
  if (roleIntroduction) lcKeys.push(roleIntroduction)
  if (roleFeatures) lcKeys.push(roleFeatures)

  const defaultSkin = parseInitialSkinId(role?.role_initial_skins)
  const skinIds = parsePrimitiveList(role?.role_skins)
    .map(Number)
    .filter((n) => Number.isFinite(n))

  if (!skinIds.length) {
    return { skins: [], roleIntroduction, roleFeatures, lcKeys }
  }

  const { data: icons } = await supabase
    .from('IconConfig')
    .select('id, payload')
    .in('id', skinIds)

  const { data: resources } = await supabase
    .from('RoleResourcesConfig')
    .select('id, role_name')
    .in('id', skinIds)

  const byId = new Map(
    (icons ?? []).map((row) => [Number(row.id), row.payload as IconConfigPayload])
  )
  const nameById = new Map(
    (resources ?? []).map((row) => [
      Number(row.id),
      typeof row.role_name === 'string' && row.role_name.trim() ? row.role_name : null,
    ])
  )

  const skins: HeroOverviewSkin[] = skinIds
    .map((skinId) => {
      const squareRaw = iconPathFromPayload(byId.get(skinId), 'role_square_icon_path')
      const squarePath = squareRaw ? convertHeroHeadIconPath(squareRaw) : null
      const squareUrl = squarePath ? resolveAssetUrl(squarePath) : IMAGE_UNAVAILABLE
      const nameKey = nameById.get(skinId) ?? null
      if (nameKey) lcKeys.push(nameKey)
      return {
        skinId,
        squarePath,
        squareUrl,
        nameKey,
        isDefault: defaultSkin != null && skinId === defaultSkin,
      }
    })
    .filter((s) => s.squareUrl !== IMAGE_UNAVAILABLE)
    // Gallery shows unlockable/extra skins only — not the initial skin.
    .filter((s) => !s.isDefault)

  return { skins, roleIntroduction, roleFeatures, lcKeys }
}

async function loadStarSteps(heroId: number): Promise<HeroOverviewStarStep[]> {
  const { data: hero } = await supabase
    .from('HeroConfig')
    .select('hero_star')
    .eq('id', heroId)
    .maybeSingle()

  const starIds = parsePrimitiveList(hero?.hero_star)
    .map(Number)
    .filter((n) => Number.isFinite(n))
  // HeroStarUpPreView / HeroDetailStarUpView: last entry is max-star state (no upgrade).
  // Costs to reach stars 1..max are hero_star[0..n-2]; lookup at star S uses hero_star[S].
  const costIds = starIds.length > 1 ? starIds.slice(0, -1) : []
  if (!costIds.length) return []

  const payloads = await fetchPayloadRows('HeroStarUpConfig', costIds)
  return costIds.map((id, index) => {
    const step = parseHeroStarUpPayload(payloads.get(id), id)
    // Primary costs only — general_item is a substitute, not an extra required cost.
    const materials = [...step.consume, ...step.consumeCurrency]
    return {
      ...step,
      // Target star after this upgrade (HeroStarUpPreItem index / SetStar(star + 1)).
      starLevel: index + 1,
      materials: materials.filter((m) => m.num > 0),
    }
  })
}

async function loadAwakenSteps(heroId: number): Promise<HeroOverviewAwakenStep[]> {
  const { data: awakenCfg } = await supabase
    .from('HeroAwakenConfig')
    .select('awaken_list')
    .eq('id', heroId)
    .maybeSingle()

  const awakenIds = parseGameData(awakenCfg?.awaken_list) as number[]
  if (!awakenIds?.length) return []

  const { data: infos } = await supabase
    .from('HeroAwakenInfoConfig')
    .select('id, awaken_level, consume, add_skill')
    .in('id', awakenIds)

  const byId = new Map((infos ?? []).map((row) => [Number(row.id), row]))
  return awakenIds
    .map((id) => {
      const row = byId.get(Number(id))
      if (!row) return null
      return {
        id: Number(row.id),
        awakenLevel: Number(row.awaken_level ?? 0),
        consume: normalizeConsumeList(row.consume),
        addSkill: normalizeSkillRefList(row.add_skill),
      }
    })
    .filter((s): s is HeroOverviewAwakenStep => s != null)
    .sort((a, b) => a.awakenLevel - b.awakenLevel)
}

export async function loadHeroOverviewBundle(
  heroId: number,
  lang: string
): Promise<HeroOverviewBundle | null> {
  if (!Number.isFinite(heroId) || !isHeroListed(heroId)) return null

  const { data: hero } = await supabase
    .from('HeroConfig')
    .select('clothid')
    .eq('id', heroId)
    .maybeSingle()

  const clothId =
    hero?.clothid != null && Number.isFinite(Number(hero.clothid))
      ? Number(hero.clothid)
      : null

  const [skinBlock, clothBlock, starSteps, awakenSteps] = await Promise.all([
    loadSkins(heroId),
    clothId != null ? loadClothBlock(clothId) : Promise.resolve({ cloth: null, lcKeys: [] }),
    loadStarSteps(heroId),
    loadAwakenSteps(heroId),
  ])

  const figureBlock = await loadFigures(
    heroId,
    clothId,
    clothBlock.cloth?.nameKey ?? null,
    clothBlock.cloth?.descKey ?? null,
    skinBlock.roleIntroduction
  )

  const consumeEntries: ConsumeEntry[] = []
  for (const step of starSteps) consumeEntries.push(...step.materials)
  for (const step of awakenSteps) consumeEntries.push(...step.consume)

  const [consumeRefMap, translations] = await Promise.all([
    loadConsumeRefMap(consumeEntries, lang),
    translateKeys(
      [
        ...skinBlock.lcKeys,
        ...clothBlock.lcKeys,
        ...figureBlock.lcKeys,
      ],
      lang
    ),
  ])

  return {
    heroId,
    roleIntroduction: skinBlock.roleIntroduction,
    roleFeatures: skinBlock.roleFeatures,
    cloth: clothBlock.cloth,
    figures: figureBlock.figures,
    skins: skinBlock.skins,
    starSteps,
    awakenSteps,
    consumeRefMap,
    translations,
  }
}
