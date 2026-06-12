'use client'

import { parseGameData } from '@/lib/game/parse-game-data'

type StarRangeRow = {
  id: number
  star_min: number
  star_max: number
  skill_level?: number
  lv_max?: number
}

type StarIndexRow = {
  id: number
  list: number[]
}

type RiseQualityRow = {
  id: number
  unlock_self?: unknown
  unlock_material?: unknown
  num?: number
}

type StarLossRow = {
  id: number
  min: number
  max: number
  value: number
}

type CompanionProgressionProps = {
  starIndexes: StarIndexRow[]
  starConfigs: Record<number, StarRangeRow>
  riseQuality: RiseQualityRow[]
  starLoss: StarLossRow[]
  getT: (key?: string) => string
}

function parseUnlockList(raw: unknown): { type?: string; value?: number; desc?: string }[] {
  const parsed = parseGameData(raw)
  if (!Array.isArray(parsed)) return []
  return parsed.map((item) => {
    if (Array.isArray(item) && item.length >= 4) {
      return { desc: item[0], type: item[2], value: item[3] }
    }
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>
      return {
        desc: o.desc as string | undefined,
        type: o.type as string | undefined,
        value: o.value as number | undefined,
      }
    }
    return {}
  })
}

export default function CompanionProgression({
  starIndexes,
  starConfigs,
  riseQuality,
  starLoss,
  getT,
}: CompanionProgressionProps) {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Star Ranges by Quality
        </h3>
        <div className="space-y-4">
          {starIndexes.map((idx) => {
            const list = Array.isArray(idx.list) ? idx.list : parseGameData(idx.list)
            const starIds: number[] = Array.isArray(list)
              ? list.map((v) => Number(v)).filter((n) => !Number.isNaN(n))
              : []

            return (
              <div
                key={idx.id}
                className="rounded-lg border border-panel-border bg-panel-hover/30 p-4"
              >
                <h4 className="mb-2 font-semibold text-foreground">
                  Quality {idx.id}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-panel-border text-xs text-text-muted">
                        <th className="py-2 pr-4">Range</th>
                        <th className="py-2 pr-4">Stars</th>
                        <th className="py-2 pr-4">Max Level</th>
                        <th className="py-2">Skill Lv</th>
                      </tr>
                    </thead>
                    <tbody>
                      {starIds.map((starId) => {
                        const cfg = starConfigs[starId]
                        if (!cfg) return null
                        return (
                          <tr key={starId} className="border-b border-panel-border/50">
                            <td className="py-2 pr-4 text-text-muted">{starId}</td>
                            <td className="py-2 pr-4">
                              {cfg.star_min} – {cfg.star_max}
                            </td>
                            <td className="py-2 pr-4">{cfg.lv_max ?? '—'}</td>
                            <td className="py-2">{cfg.skill_level ?? '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {riseQuality.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Quality Upgrade Requirements
          </h3>
          <div className="space-y-3">
            {riseQuality.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-panel-border bg-panel-hover/30 p-4 text-sm"
              >
                <p className="mb-2 font-semibold">Target Quality {row.id}</p>
                <ul className="list-inside list-disc space-y-1 text-text-muted">
                  {parseUnlockList(row.unlock_self).map((u, i) => (
                    <li key={`self-${i}`}>
                      Self: {u.type} ≥ {u.value}
                      {u.desc ? ` (${getT(u.desc)})` : ''}
                    </li>
                  ))}
                  {parseUnlockList(row.unlock_material).map((u, i) => (
                    <li key={`mat-${i}`}>
                      Material: {u.type} ≥ {u.value}
                      {u.desc ? ` (${getT(u.desc)})` : ''}
                    </li>
                  ))}
                  {row.num != null && <li>Copies required: {row.num}</li>}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {starLoss.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Material Loss by Star (when used as fodder)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-panel-border text-xs text-text-muted">
                  <th className="py-2 pr-4">Star Range</th>
                  <th className="py-2">Return %</th>
                </tr>
              </thead>
              <tbody>
                {starLoss.map((row) => (
                  <tr key={row.id} className="border-b border-panel-border/50">
                    <td className="py-2 pr-4">
                      {row.min} – {row.max}
                    </td>
                    <td className="py-2">{row.value}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
