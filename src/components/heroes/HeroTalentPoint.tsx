'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  filterVisibleAttributes,
  formatTalentAttributeValue,
} from '@/lib/game/format-talent-attribute'
import { aggregateConsume } from '@/lib/game/aggregate-consume'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { TalentPointData } from '@/lib/game/talent-types'
import { UI_KEYS } from '@/lib/i18n/ui-keys'
import HeroTalentMaterialsRow from './HeroTalentMaterialsRow'

interface HeroTalentPointProps {
  point: TalentPointData
  visibleStats: string[]
  getT: (key?: string) => string
  consumeRefMap: ConsumeRefMap
}

function formatHeroLevelLabel(level: number, getT: (key?: string) => string): string {
  const template = getT(UI_KEYS.common.heroLv)
  if (template.includes('{0}')) return template.replace('{0}', String(level))
  return `${template} ${level}`
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
  const levelsLabel = getT(UI_KEYS.hero.talentLevelLabel)

  return (
    <div className="hero-talents-point-detail">
      <div
        className="hero-talents-level-chips"
        role="tablist"
        aria-label={levelsLabel}
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
              className={`hero-talents-chip${isActive ? ' hero-talents-chip--active' : ''}`}
            >
              {formatHeroLevelLabel(level.level, getT)}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" className="hero-talents-point-detail__body">
        {stats.length > 0 ? (
          <section className="hero-talents-section">
            <h5 className="hero-talents-section__title">
              {getT(UI_KEYS.hero.talentEffectTitle)}
            </h5>
            <ul className="hero-talents-attr-list">
              {stats.map((attr) => (
                <li key={`${activeLevel.id}-${attr.stat}`} className="hero-talents-attr">
                  <span className="hero-talents-attr__label">{getT(attr.stat)}</span>
                  <span className="hero-talents-attr__value">
                    +{formatTalentAttributeValue(attr.value, attr.isPercent)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <HeroTalentMaterialsRow
          materials={activeLevel.consume}
          cumulative={cumulativeConsume}
          consumeRefMap={consumeRefMap}
          materialsLabel={getT(UI_KEYS.hero.talentUpgradeMaterials)}
        />
      </div>
    </div>
  )
}
