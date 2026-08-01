import { COSMO_SENSE_LC_KEYS } from '@/lib/assets/cosmo-images'
import { computeCosmoNodePositions } from '@/lib/game/build-cosmo-tree'
import type {
  CosmoPassiveSkill,
  CosmoPointData,
  CosmoSenseData,
  HeroCosmoData,
} from '@/lib/game/cosmo-types'
import {
  parseCosmoConfigPayload,
  parseCosmoDomainPayload,
  parseCosmoLineListPayload,
  parseCosmoLinePayload,
  parseCosmoPointAttributes,
  parseCosmoPointConsume,
  parseCosmoPointPayload,
} from '@/lib/game/parse-cosmo-payload'
import { supabase } from '@/lib/supabase-client'

type PayloadRow = { id: number; payload: unknown }

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function normalizePayloadRow(row: { id: unknown; payload: unknown }): PayloadRow | null {
  const id = Number(row.id)
  if (!Number.isFinite(id)) return null
  return { id, payload: row.payload }
}

async function fetchPayloadMap(table: string, ids: number[]): Promise<Map<number, PayloadRow>> {
  const map = new Map<number, PayloadRow>()
  const unique = [...new Set(ids.filter((id) => id > 0))]
  if (!unique.length) return map

  for (const part of chunk(unique, 400)) {
    const { data } = await supabase.from(table).select('id, payload').in('id', part)
    for (const row of data || []) {
      const normalized = normalizePayloadRow(row as { id: unknown; payload: unknown })
      if (normalized) map.set(normalized.id, normalized)
    }
  }
  return map
}

async function fetchAllPayloadRows(table: string): Promise<Map<number, PayloadRow>> {
  const map = new Map<number, PayloadRow>()
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('id, payload')
      .range(from, from + pageSize - 1)
    if (error) throw error
    const rows = (data || []) as { id: unknown; payload: unknown }[]
    if (!rows.length) break
    for (const row of rows) {
      const normalized = normalizePayloadRow(row)
      if (normalized) map.set(normalized.id, normalized)
    }
    if (rows.length < pageSize) break
    from += pageSize
  }
  return map
}

export async function loadHeroCosmo(heroId: number): Promise<HeroCosmoData | null> {
  const { data: cosmoRow } = await supabase
    .from('CosmoConfig')
    .select('id, payload')
    .eq('id', heroId)
    .maybeSingle()

  if (!cosmoRow?.payload) return null

  const cosmo = parseCosmoConfigPayload(cosmoRow.payload)
  const domainIds = cosmo.domainlist
  if (!domainIds.length) return null

  const resourceId = heroId * 10
  const [{ data: roleRow }, { data: resourceRow }, domainMap, lineListMap, lineMap] = await Promise.all([
    supabase.from('RoleConfig').select('role_constellation_name').eq('id', heroId).maybeSingle(),
    supabase.from('RoleResourcesConfig').select('role_name').eq('id', resourceId).maybeSingle(),
    fetchPayloadMap('CosmoDomainConfig', domainIds),
    fetchAllPayloadRows('CosmoLineListConfig'),
    fetchAllPayloadRows('CosmoLineConfig'),
  ])

  const pointIds: number[] = []
  const consumeIds: number[] = []
  const attributeIds: number[] = []

  for (const domainId of domainIds) {
    const domain = domainMap.get(domainId)
    if (!domain) continue
    const parsed = parseCosmoDomainPayload(domain.payload)
    pointIds.push(...parsed.pointlist)
  }

  const pointMap = await fetchPayloadMap('CosmoPointConfig', pointIds)

  for (const pointId of pointIds) {
    const row = pointMap.get(pointId)
    if (!row) continue
    const p = parseCosmoPointPayload(row.payload)
    if (p.consumeId > 0) consumeIds.push(p.consumeId)
    if (p.attributeId > 0) attributeIds.push(p.attributeId)
  }

  const [consumeMap, attributeMap] = await Promise.all([
    fetchPayloadMap('CosmoPointConsumeConfig', consumeIds),
    fetchPayloadMap('CosmoPointAttributeConfig', attributeIds),
  ])

  const senses: CosmoSenseData[] = []
  const passives: CosmoPassiveSkill[] = []

  domainIds.forEach((domainId, senseIdx) => {
    const domainRow = domainMap.get(domainId)
    if (!domainRow) return

    const domain = parseCosmoDomainPayload(domainRow.payload)
    const lineListRow = lineListMap.get(domain.lineType)
    const lineIds = lineListRow ? parseCosmoLineListPayload(lineListRow.payload).lineList : []
    const lines = lineIds
      .map((lineId) => {
        const row = lineMap.get(lineId)
        return row ? parseCosmoLinePayload(row.payload) : null
      })
      .filter((l): l is NonNullable<typeof l> => l != null)
      .map((l) => ({ id: l.id, startIndex: l.startIndex, endIndex: l.endIndex }))

    const points: CosmoPointData[] = domain.pointlist.map((pointId, idx) => {
      const row = pointMap.get(pointId)
      const parsed = row ? parseCosmoPointPayload(row.payload) : null
      const consumeRow = parsed && parsed.consumeId > 0 ? consumeMap.get(parsed.consumeId) : null
      const attrRow = parsed && parsed.attributeId > 0 ? attributeMap.get(parsed.attributeId) : null
      const index = idx + 1

      const point: CosmoPointData = {
        id: pointId,
        index,
        type: parsed?.type ?? 1,
        pointTex: parsed?.pointTex ?? '',
        addUv: parsed?.addUv ?? 0,
        prepointIds: parsed?.prepointIds ?? [],
        needUv: parsed?.needUv ?? 0,
        needTotalUv: parsed?.needTotalUv ?? 0,
        needHeroLevel: parsed?.needHeroLevel ?? 0,
        consumeId: parsed?.consumeId ?? 0,
        attributeId: parsed?.attributeId ?? 0,
        addSkill: parsed?.addSkill ?? 0,
        consume: consumeRow ? parseCosmoPointConsume(consumeRow.payload) : [],
        attributes: attrRow ? parseCosmoPointAttributes(attrRow.payload) : [],
      }

      if (point.addSkill > 0) {
        passives.push({
          skillId: point.addSkill,
          senseIndex: senseIdx + 1,
          domainId,
          pointId,
          pointIndex: index,
          isSpecial: point.type === 2,
        })
      }

      return point
    })

    const totalUv = points.reduce((sum, p) => sum + p.addUv, 0)
    const maxIndex = Math.max(...lines.map((l) => Math.max(l.startIndex, l.endIndex)), points.length)
    const positions = computeCosmoNodePositions(lines, maxIndex)

    senses.push({
      senseIndex: senseIdx + 1,
      domainId,
      lineType: domain.lineType,
      pointIds: domain.pointlist,
      smallPointSort: domain.smallPointSort,
      largePointSort: domain.largePointSort,
      unlock: domain.unlock,
      points,
      lines,
      positions,
      totalUv,
    })
  })

  return {
    heroId,
    path: cosmo.path,
    constellationNameKey: roleRow?.role_constellation_name
      ? String(roleRow.role_constellation_name)
      : null,
    galleryNameKey: `LC_Gallery_universe_name_${heroId}`,
    heroNameKey: resourceRow?.role_name ? String(resourceRow.role_name) : null,
    unlock: cosmo.unlock,
    senses,
    passives,
    senseLabelKeys: COSMO_SENSE_LC_KEYS,
  }
}

export async function heroHasCosmo(heroId: number): Promise<boolean> {
  const { data } = await supabase.from('CosmoConfig').select('id').eq('id', heroId).maybeSingle()
  return Boolean(data)
}
