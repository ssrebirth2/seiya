'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  filterVisibleAttributes,
  formatTalentAttributeValue,
} from '@/lib/game/format-talent-attribute'
import { aggregateConsume } from '@/lib/game/aggregate-consume'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { TalentPointData } from '@/lib/game/talent-types'
import HeroTalentMaterialsRow from './HeroTalentMaterialsRow'

interface HeroTalentPointProps {
  point: TalentPointData
  visibleStats: string[]
  getT: (key?: string) => string
  consumeRefMap: ConsumeRefMap
}

export default function HeroTalentPoint({
  point,
  visibleStats,
  getT,
  consumeRefMap,
}: HeroTalentPointProps) {
  const [activeLevelIdx, setActiveLevelIdx] = useState(0)

  useEffect(() => {
    setActiveLevelIdx(0)
  }, [point.id])

  const activeLevel = point.levels[activeLevelIdx]

  const cumulativeConsume = useMemo(() => {
    const items = point.levels.slice(0, activeLevelIdx + 1).flatMap((level) => level.consume)
    return aggregateConsume(items)
  }, [point.levels, activeLevelIdx])

  if (!activeLevel) return null

  const stats = filterVisibleAttributes(activeLevel.attributes, visibleStats)

  return (
    <div className="mt-4">
      <h4 className="mb-3 text-sm font-semibold">
        Point {point.index}
        <span className="ml-1 font-normal text-text-muted">#{point.id}</span>
      </h4>

      <div
        className="mb-4 flex flex-wrap gap-2"
        role="tablist"
        aria-label={`Point ${point.index} levels`}
      >
        {point.levels.map((level, idx) => {
          const isActive = idx === activeLevelIdx
          return (
            <button
              key={level.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveLevelIdx(idx)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                isActive
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-panel-border bg-panel hover:bg-panel-hover'
              }`}
            >
              Lv. {level.level}
            </button>
          )
        })}
      </div>

      <div role="tabpanel">
        {stats.length > 0 && (
          <ul className="space-y-1 text-sm">
            {stats.map((attr) => (
              <li key={`${activeLevel.id}-${attr.stat}`} className="flex justify-between gap-3">
                <span className="text-text-muted">{getT(attr.stat)}</span>
                <span className="shrink-0 font-medium text-emerald-600 dark:text-emerald-400">
                  +{formatTalentAttributeValue(attr.value, attr.isPercent)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <HeroTalentMaterialsRow
          materials={activeLevel.consume}
          cumulative={cumulativeConsume}
          consumeRefMap={consumeRefMap}
        />
      </div>
    </div>
  )
}
