import { parseGameData } from '@/lib/game/parse-game-data'

export type AttributeTriple = [string, number, number]

export function parseAttributeList(raw: unknown): AttributeTriple[] {
  const parsed = parseGameData(raw)
  if (!Array.isArray(parsed)) return []
  return parsed.filter(
    (row): row is AttributeTriple =>
      Array.isArray(row) && row.length >= 3 && typeof row[0] === 'string'
  )
}

/** Base attrs: foundation + per-level scaling (PrimarySpirit:GetBasicAttributes). */
export function computeBaseAttributes(
  foundation: AttributeTriple[],
  perLevel: AttributeTriple[],
  level: number
): AttributeTriple[] {
  const attrs: AttributeTriple[] = foundation.map((row) => [...row] as AttributeTriple)

  for (const row of perLevel) {
    const [key, mode, value] = row
    const scaled: AttributeTriple = [key, mode, value * level]
    const existing = attrs.find((a) => a[0] === key && a[1] === mode)
    if (existing) {
      existing[2] += scaled[2]
    } else {
      attrs.push(scaled)
    }
  }

  return attrs
}

/** Team attrs from star range config (PrimarySpirit:GetTeamAttributes). */
export function computeTeamAttributes(
  star: number,
  starMin: number,
  sumAttrs: AttributeTriple[],
  perStarAttrs: AttributeTriple[],
  percentAttrs: AttributeTriple[]
): AttributeTriple[] {
  const attrs: AttributeTriple[] = sumAttrs.map((row) => [...row] as AttributeTriple)

  const starFactor = star - starMin + 1
  for (const row of perStarAttrs) {
    const [key, mode, value] = row
    const add = value * starFactor
    const existing = attrs.find((a) => a[0] === key && a[1] === mode)
    if (existing) {
      existing[2] += add
    } else {
      attrs.push([key, mode, add])
    }
  }

  for (const row of percentAttrs) {
    const [key, , pct] = row
    const existing = attrs.find((a) => a[0] === key)
    if (existing) {
      existing[2] = existing[2] * (1 + pct * 0.01)
    }
  }

  return attrs
}

export function formatAttributeValue(row: AttributeTriple): string {
  const [key, mode, value] = row
  const suffix = mode === 2 ? '%' : ''
  return `${key}: ${value}${suffix}`
}
