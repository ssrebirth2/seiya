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
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { ConsumeList } from '@/components/game/ConsumeList'
import { useConsumeRefMap } from '@/hooks/use-consume-ref-map'

setupGlobalSkillTooltips()

type StarRow = {
  id: number
  artifact_id: number
  quality: number
  star: number
  consume_num?: number
  exchange_num?: number
  consume_money?: unknown
  consume_item?: unknown
  attribute?: unknown
  skill_up?: unknown
  power_ratio?: number
}

type SkillConfig = {
  skillid: number
  name: string
  iconpath?: string
  skill_des?: unknown
  skill_sketch?: unknown
}

type Props = {
  stars: StarRow[]
  skill: SkillConfig | null
  getT: (key?: string) => string
  valuesMap: Record<number, (string | number)[]>
}

function ArtifactCostBlock({
  copies,
  money,
  items,
  exchangeNum,
}: {
  copies?: number
  money: ConsumeEntry[]
  items: ConsumeEntry[]
  exchangeNum?: number
}) {
  const allConsumes = useMemo(() => [...money, ...items], [money, items])
  const { consumeRefMap, ready } = useConsumeRefMap(allConsumes)
  const { t } = useUiTranslation()

  const hasMoney = money.some((c) => Number(c.num) > 0)
  const hasItems = items.length > 0

  if (!copies && !hasMoney && !hasItems && !exchangeNum) return null

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{t(UI_KEYS.item.upgradeCost)}</p>

      {(copies ?? 0) > 0 ? (
        <p className="text-xs text-text-muted">
          {t(UI_KEYS.item.neededCopies)}: {copies}
        </p>
      ) : null}

      {ready && hasMoney ? (
        <div>
          <ConsumeList items={money.filter((c) => Number(c.num) > 0)} consumeRefMap={consumeRefMap} compact />
        </div>
      ) : null}

      {ready && hasItems ? (
        <div>
          <p className="mb-1 text-xs text-text-muted">{t(UI_KEYS.artifact.addMaterials)}</p>
          <ConsumeList items={items} consumeRefMap={consumeRefMap} compact />
        </div>
      ) : null}

      {exchangeNum ? (
        <p className="text-xs text-text-muted">
          {t(UI_KEYS.item.cumulativeTotal)}: ×{exchangeNum}
        </p>
      ) : null}
    </div>
  )
}

export default function ArtifactSkillList({ stars, skill, getT, valuesMap }: Props) {
  const { t } = useUiTranslation()

  const groupedByQuality = useMemo(() => {
    const groups: Record<number, StarRow[]> = {}
    for (const s of stars) {
      if (!groups[s.quality]) groups[s.quality] = []
      groups[s.quality].push(s)
    }
    Object.values(groups).forEach((list) => list.sort((a, b) => a.star - b.star))
    return groups
  }, [stars])

  const allQualities = useMemo(
    () => Object.keys(groupedByQuality).map(Number).sort((a, b) => a - b),
    [groupedByQuality]
  )

  const [activeQuality, setActiveQuality] = useState<number | null>(allQualities[0] ?? null)

  const renderSketchesUpToLevel = (lv: number) => {
    const sketches = normalizeDesValueList(skill?.skill_sketch)
    if (!sketches.length) return null

    const accumulated = sketches.slice(0, lv)

    return (
      <div className="space-y-1">
        {accumulated.map((sk, i: number) => {
          const text = applySkillValues(getT(sk.des), sk.value ?? 0, valuesMap)
          const isNew = i === lv - 1

          return (
            <div
              key={`sketch-${i}`}
              className={`whitespace-pre-wrap rounded-sm px-2 py-1 text-sm leading-tight text-text-muted ${
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
        <div className="scroll-strip-h scroll-fade-x gap-1 pb-px flex">
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
          {(groupedByQuality[activeQuality] || []).map((row) => {
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
                <p className="mb-1 font-semibold">★ {row.star}</p>

                <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                  <div>{lv > 0 && renderSketchesUpToLevel(lv)}</div>

                  <div className="space-y-1 text-xs text-text-muted">
                    <p className="text-sm font-semibold">{t(UI_KEYS.common.baseAttribute)}:</p>
                    {attributes.length > 0 && (
                      <ul className="ml-4">
                        {attributes.map((attr: unknown, i: number) => {
                          const a = attr as [string, unknown, unknown]
                          return (
                            <li key={i}>
                              <span className="font-medium">{getT(a[0])}</span> +{String(a[2])}{' '}
                            </li>
                          )
                        })}
                      </ul>
                    )}

                    <ArtifactCostBlock
                      copies={row.consume_num}
                      money={money}
                      items={items}
                      exchangeNum={row.exchange_num}
                    />
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
