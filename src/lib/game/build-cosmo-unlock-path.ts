import type { CosmoLineEdge, CosmoNodePosition, CosmoPointData } from '@/lib/game/cosmo-types'

function buildAdjacency(lines: CosmoLineEdge[]): Map<number, number[]> {
  const adj = new Map<number, number[]>()
  const add = (a: number, b: number) => {
    if (!adj.has(a)) adj.set(a, [])
    adj.get(a)!.push(b)
  }
  for (const line of lines) {
    add(line.startIndex, line.endIndex)
    add(line.endIndex, line.startIndex)
  }
  return adj
}

/** Port of SenseData:FindListToUnlock — path from root (0) to target point index. */
export function findUnlockPath(
  target: CosmoPointData,
  pointsByIndex: Map<number, CosmoPointData>,
  lines: CosmoLineEdge[]
): CosmoPointData[] {
  const targetIndex = target.index
  if (targetIndex <= 0) return []

  const adj = buildAdjacency(lines)
  const queue: { index: number; path: number[] }[] = [{ index: 0, path: [0] }]
  const visited = new Set<string>()

  while (queue.length) {
    const { index, path } = queue.shift()!
    if (index === targetIndex) {
      return path.map((i) => pointsByIndex.get(i)).filter((p): p is CosmoPointData => p != null)
    }
    const key = path.join(',')
    if (visited.has(key)) continue
    visited.add(key)

    for (const next of adj.get(index) ?? []) {
      if (path.includes(next)) continue
      queue.push({ index: next, path: [...path, next] })
    }
  }

  return [target]
}

export function consumesOnUnlockPath(path: CosmoPointData[]): CosmoPointData[] {
  return path.filter((p) => p.index > 0)
}
