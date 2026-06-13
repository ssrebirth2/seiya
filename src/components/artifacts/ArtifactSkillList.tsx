'use client'

import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

import { useMemo, useState } from 'react'
import { applySkillValues, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import {
  normalizeConsumeList,
  normalizeDesValueList,
  normalizeSkillRefList,
  parseGameData,
} from '@/lib/game/parse-game-data'

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

export default function ArtifactSkillList({ stars, skill, getT, valuesMap }: Props) {
  const { t } = useUiTranslation()
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
    const sketches = normalizeDesValueList(skill?.skill_sketch)
    if (!sketches.length) return null

    const accumulated = sketches.slice(0, lv)

    return (
      <div className="space-y-1">
        {accumulated.map((sk, i: number) => {
          const text = applySkillValues(getT(sk.des), sk.value ?? 0, valuesMap)
          const isNew = i === lv - 1 // último é o novo adquirido

          return (
            <div
              key={`sketch-${i}`}
              className={`text-sm leading-tight text-text-muted whitespace-pre-wrap rounded-sm px-2 py-1
                ${
                  isNew
                    ? 'border border-accent/40 bg-panel-hover'
                    : 'border-l border-panel-border pl-2'
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
      <div
        className="border-b border-panel-border px-3 sm:px-4"
        role="tablist"
        aria-label="Artifact progression by quality"
      >
        <div className="flex scroll-strip-h scroll-fade-x gap-1 pb-px">
          {allQualities.map((q) => (
            <button
              key={`q-${q}`}
              type="button"
              role="tab"
              aria-selected={activeQuality === q}
              onClick={() => setActiveQuality(q)}
              className={`tab-btn ${activeQuality === q ? 'tab-btn-active' : 'tab-btn-inactive'}`}
            >
              {getT(`LC_COMMON_quality_name_${q}`)}
            </button>
          ))}
        </div>
      </div>

      {activeQuality != null && (
        <div className="space-y-4 p-4 sm:p-6">
          {(groupedByQuality[activeQuality] || []).map(row => {
            const attributes = parseGameData(row.attribute)
            const skills = normalizeSkillRefList(row.skill_up)
            const money = normalizeConsumeList(row.consume_money)
            const items = normalizeConsumeList(row.consume_item)
            const lv = Number(skills[0]?.skill_lv ?? 0)

            return (
              <div
                key={row.id}
                className="timeline-item ml-2 rounded-lg border border-panel-border bg-panel p-3 transition-all hover:border-accent/40"
              >
                <p className="font-semibold mb-1">★ {row.star}</p>

                {/* === Duas colunas === */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Coluna esquerda: descrições acumuladas */}
                  <div>{lv > 0 && renderSketchesUpToLevel(lv)}</div>

                  {/* Coluna direita: atributos + custos */}
                  <div className="text-xs text-text-muted space-y-1">
                    {/* Atributos */}
                    <p className="text-sm font-semibold">{t(UI_KEYS.common.baseAttribute)}:</p>
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

                    {money.some((c) => Number(c.num) > 0) && (
                        <p>
                            Gold:{' '}
                            {money
                                .filter((c) => Number(c.num) > 0)
                                .map((c) => Number(c.num).toLocaleString())
                                .join(', ')}
                        </p>
                    )}

                    {items.length > 0 && (
                      <p>Upgrade Item: x{items.map((c) => `${c.num}`).join(', ')}</p>
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
