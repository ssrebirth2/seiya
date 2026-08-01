import { normalizeConsumeList, parseGameData, parsePrimitiveList } from '@/lib/game/parse-game-data'
import type { CosmoUnlockEntry } from '@/lib/game/cosmo-types'

function payloadRow(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  return parseGameData(payload)
}

function at<T>(row: unknown[], index: number, fallback: T): T {
  const v = row[index]
  if (v == null || v === '') return fallback
  return v as T
}

export function parseCosmoUnlock(raw: unknown): CosmoUnlockEntry[] {
  return parseGameData(raw).flatMap((item) => {
    if (Array.isArray(item) && item.length >= 4) {
      return [
        {
          desc: item[0] != null ? String(item[0]) : undefined,
          object_id: item[1] != null ? Number(item[1]) : null,
          type: item[2] != null ? String(item[2]) : undefined,
          value: item[3] != null ? Number(item[3]) : undefined,
        },
      ]
    }
    return []
  })
}

export function parseCosmoConfigPayload(payload: unknown) {
  const row = payloadRow(payload)
  return {
    id: Number(at(row, 0, 0)),
    path: String(at(row, 1, '')),
    domainlist: parsePrimitiveList(at(row, 2, [])).map(Number),
    unlock: parseCosmoUnlock(at(row, 3, [])),
  }
}

export function parseCosmoDomainPayload(payload: unknown) {
  const row = payloadRow(payload)
  return {
    id: Number(at(row, 0, 0)),
    lineType: Number(at(row, 1, 1)),
    pointlist: parsePrimitiveList(at(row, 2, [])).map(Number),
    smallPointSort: parsePrimitiveList(at(row, 3, [])).map(Number),
    largePointSort: parsePrimitiveList(at(row, 4, [])).map(Number),
    unlock: parseCosmoUnlock(at(row, 5, [])),
  }
}

export function parseCosmoPointPayload(payload: unknown) {
  const row = payloadRow(payload)
  const addSkillRaw = at(row, 10, -1)
  return {
    id: Number(at(row, 0, 0)),
    type: Number(at(row, 1, 1)),
    pointTex: String(at(row, 2, '')),
    addUv: Number(at(row, 3, 0)),
    prepointIds: parsePrimitiveList(at(row, 4, [])).map(Number),
    needUv: Number(at(row, 5, 0)),
    needTotalUv: Number(at(row, 6, 0)),
    needHeroLevel: Number(at(row, 7, 0)),
    consumeId: Number(at(row, 8, 0)),
    attributeId: Number(at(row, 9, 0)),
    addSkill: addSkillRaw == null || addSkillRaw === -1 ? 0 : Number(addSkillRaw),
  }
}

export function parseCosmoLinePayload(payload: unknown) {
  const row = payloadRow(payload)
  return {
    id: Number(at(row, 0, 0)),
    startIndex: Number(at(row, 1, 0)),
    endIndex: Number(at(row, 2, 0)),
  }
}

export function parseCosmoLineListPayload(payload: unknown) {
  const row = payloadRow(payload)
  return {
    id: Number(at(row, 0, 0)),
    lineList: parsePrimitiveList(at(row, 1, [])).map(Number),
  }
}

export function parseCosmoPointAttributes(payload: unknown) {
  const row = payloadRow(payload)
  const attrRaw = row.length > 1 ? row[1] : row
  return parseGameData(attrRaw).flatMap((item) => {
    if (Array.isArray(item) && item.length >= 3) {
      return [
        {
          statKey: String(item[0]),
          ratioFlag: Number(item[1]),
          value: Number(item[2]),
        },
      ]
    }
    return []
  })
}

export function parseCosmoPointConsume(payload: unknown) {
  const row = payloadRow(payload)
  const consumeRaw = row.length > 1 ? row[1] : row
  return normalizeConsumeList(consumeRaw)
}
