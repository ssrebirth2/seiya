import type { ConsumeEntry } from '@/lib/game/parse-game-data'

export type CosmoUnlockEntry = {
  desc?: string
  object_id?: number | null
  type?: string
  value?: number
}

export type CosmoStatBonus = {
  statKey: string
  ratioFlag: number
  value: number
}

export type CosmoPointData = {
  id: number
  index: number
  type: number
  pointTex: string
  addUv: number
  prepointIds: number[]
  needUv: number
  needTotalUv: number
  needHeroLevel: number
  consumeId: number
  attributeId: number
  addSkill: number
  consume: ConsumeEntry[]
  attributes: CosmoStatBonus[]
}

export type CosmoLineEdge = {
  id: number
  startIndex: number
  endIndex: number
}

export type CosmoNodePosition = {
  index: number
  x: number
  y: number
}

export type CosmoSenseData = {
  senseIndex: number
  domainId: number
  lineType: number
  pointIds: number[]
  smallPointSort: number[]
  largePointSort: number[]
  unlock: CosmoUnlockEntry[]
  points: CosmoPointData[]
  lines: CosmoLineEdge[]
  positions: CosmoNodePosition[]
  totalUv: number
}

export type CosmoPassiveSkill = {
  skillId: number
  senseIndex: number
  domainId: number
  pointId: number
  pointIndex: number
  isSpecial: boolean
}

export type HeroCosmoData = {
  heroId: number
  path: string
  constellationNameKey?: string | null
  galleryNameKey: string
  /** LC key for hero display name (RoleResourcesConfig.role_name). */
  heroNameKey?: string | null
  unlock: CosmoUnlockEntry[]
  senses: CosmoSenseData[]
  passives: CosmoPassiveSkill[]
  senseLabelKeys: string[]
}

export type HeroCosmoBundle = {
  data: HeroCosmoData
  translations: Record<string, string>
  valuesMap: Record<number, (string | number)[]>
  labelMap: Record<number, string>
  consumeRefMap: import('@/lib/game/load-hero-talents-bundle').ConsumeRefMap
  skillMap: Record<number, Record<string, unknown>>
}
