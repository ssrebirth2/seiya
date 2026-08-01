import type { CosmoLineEdge, CosmoNodePosition } from '@/lib/game/cosmo-types'

const VIEW = 100
const CENTER = VIEW / 2

/** Radial BFS layout from graph center (index 0) — used when prefab layout JSON is unavailable. */
export function computeCosmoNodePositions(lines: CosmoLineEdge[], maxIndex: number): CosmoNodePosition[] {
  const adj = new Map<number, number[]>()
  for (const line of lines) {
    if (!adj.has(line.startIndex)) adj.set(line.startIndex, [])
    if (!adj.has(line.endIndex)) adj.set(line.endIndex, [])
    adj.get(line.startIndex)!.push(line.endIndex)
    adj.get(line.endIndex)!.push(line.startIndex)
  }

  const depth = new Map<number, number>()
  const queue = [0]
  depth.set(0, 0)
  while (queue.length) {
    const cur = queue.shift()!
    for (const next of adj.get(cur) ?? []) {
      if (depth.has(next)) continue
      depth.set(next, depth.get(cur)! + 1)
      queue.push(next)
    }
  }

  const byDepth = new Map<number, number[]>()
  for (let i = 0; i <= maxIndex; i++) {
    const d = depth.get(i) ?? maxIndex
    if (!byDepth.has(d)) byDepth.set(d, [])
    byDepth.get(d)!.push(i)
  }

  const positions: CosmoNodePosition[] = []
  for (const [d, indices] of byDepth.entries()) {
    const radius = d === 0 ? 0 : 12 + d * 7
    indices.forEach((index, i) => {
      const angle = (2 * Math.PI * i) / Math.max(indices.length, 1) - Math.PI / 2
      positions.push({
        index,
        x: CENTER + radius * Math.cos(angle),
        y: CENTER + radius * Math.sin(angle),
      })
    })
  }

  return positions
}
