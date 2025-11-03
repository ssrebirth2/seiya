'use client'

import { useMemo, useState } from 'react'
import { applySkillValues, loadSkillValues, setupGlobalSkillTooltips } from '@/lib/applySkillValues'

setupGlobalSkillTooltips()

type StarRow = {
  id: number
  artifact_id: number
  quality: number
  star: number
  consume_num?: number
  exchange_num?: number
  consume_money?: any
  consume_item?: any
  attribute?: any
  skill_up?: any
  power_ratio?: number
}

type SkillConfig = {
  skillid: number
  name: string
  iconpath?: string
  skill_des?: any
  skill_sketch?: any
}

type Props = {
  stars: StarRow[]
  skill: SkillConfig | null
  getT: (key?: string) => string
  valuesMap: Record<number, (string | number)[]>
}

const parseOrEmpty = (v: any) => {
  if (!v) return []
  try {
    if (typeof v === 'string') return JSON.parse(v)
    if (Array.isArray(v)) return v
    if (typeof v === 'object') return v
  } catch {}
  return []
}

export default function ArtifactSkillList({ stars, skill, getT, valuesMap }: Props) {
  // === Agrupar por qualidade ===
  const groupedByQuality = useMemo(() => {
    const groups: Record<number, StarRow[]> = {}
    for (const s of stars) {
      if (!groups[s.quality]) groups[s.quality] = []
      groups[s.quality].push(s)
    }
    Object.values(groups).forEach(list => list.sort((a, b) => a.star - b.star))
    return groups
  }, [stars])

  const allQualities = useMemo(
    () => Object.keys(groupedByQuality).map(Number).sort((a, b) => a - b),
    [groupedByQuality]
  )

  const [activeQuality, setActiveQuality] = useState<number | null>(allQualities[0] ?? null)

  // === Renderização acumulada e compacta ===
  const renderSketchesUpToLevel = (lv: number) => {
    const sketches = parseOrEmpty(skill?.skill_sketch)
    if (!sketches || sketches.length === 0) return null

    const accumulated = sketches.slice(0, lv)

    return (
      <div className="space-y-1">
        {accumulated.map((sk: any, i: number) => {
          const text = applySkillValues(getT(sk.des), sk.value, valuesMap)
          const isNew = i === lv - 1 // último é o novo adquirido

          return (
            <div
              key={`sketch-${i}`}
              className={`text-sm leading-tight text-[var(--text-muted)] whitespace-pre-wrap rounded-sm px-2 py-1
                ${
                  isNew
                    ? 'border border-blue-400/40 bg-[var(--panel-hover)]'
                    : 'border-l border-[var(--panel-border)] pl-2'
                }`}
            >
              <div
                className="text-[13px] leading-snug"
                dangerouslySetInnerHTML={{ __html: text }}
              />
            </div>
          )
        })}
      </div>
    )
  }

  if (!allQualities.length) return null

  return (
    <section>
      {/* Tabs de Qualidade */}
      <div className="flex gap-3 border-b border-[var(--panel-border)] mb-4">
        {allQualities.map(q => (
          <button
            key={`q-${q}`}
            onClick={() => setActiveQuality(q)}
            className={`px-4 py-2 text-sm font-medium transition-all ${
              activeQuality === q
                ? 'border-b-2 border-blue-400 text-blue-400'
                : 'text-[var(--text-muted)] hover:text-blue-300'
            }`}
          >
            {getT(`LC_COMMON_quality_name_${q}`)}
          </button>
        ))}
      </div>

      {/* Conteúdo de cada qualidade */}
      {activeQuality != null && (
        <div className="space-y-4">
          {(groupedByQuality[activeQuality] || []).map(row => {
            const attributes = parseOrEmpty(row.attribute)
            const skills = parseOrEmpty(row.skill_up)
            const money = parseOrEmpty(row.consume_money)
            const items = parseOrEmpty(row.consume_item)
            const lv = Number(skills?.[0]?.skill_lv ?? 0)

            return (
              <div
                key={row.id}
                className="border rounded-lg p-3 bg-[var(--panel)] hover:border-blue-400/40 transition-all"
                style={{ borderColor: 'var(--panel-border)' }}
              >
                <p className="font-semibold mb-1">★ {row.star}</p>

                {/* === Duas colunas === */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Coluna esquerda: descrições acumuladas */}
                  <div>{lv > 0 && renderSketchesUpToLevel(lv)}</div>

                  {/* Coluna direita: atributos + custos */}
                  <div className="text-xs text-[var(--text-muted)] space-y-1">
                    {/* Atributos */}
                    <p className="text-sm font-semibold">Base Attributes:</p>
                    {attributes.length > 0 && (
                      <ul className="ml-4">
                        {attributes.map((attr: any, i: number) => (
                          <li key={i}>
                            <span className="font-medium">{getT(attr[0])}</span> +{attr[2]}{' '}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Custos */}
                    <p className="text-sm font-semibold">Upgrade to next level:</p>
                    
                    {(row.consume_num ?? 0) > 0 && (
                        <p>
                        Needed Copies:{' '}
                        {row.consume_num}
                        </p>
                    )}

                    {money.some((c: any) => Number(c.num) > 0) && (
                        <p>
                            Gold:{' '}
                            {money
                                .filter((c: any) => Number(c.num) > 0)
                                .map((c: any) => Number(c.num).toLocaleString())
                                .join(', ')}
                        </p>
                    )}

                    {items.length > 0 && (
                      <p>Upgrade Item: x{items.map((c: any) => `${c.num}`).join(', ')}</p>
                    )}
                    <br />
                    {row.exchange_num && (
                      <p>Total Copies Used: x{row.exchange_num}</p>
                    )}

                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
