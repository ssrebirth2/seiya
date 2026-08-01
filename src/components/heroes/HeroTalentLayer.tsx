'use client'

import React, { useState } from 'react'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/game-images'
import { talentPointIconPath, TALENT_POINT_ICON_CLASS } from '@/lib/assets/talent-images'
import { formatUnlockRequirement } from '@/lib/game/format-talent-attribute'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import type { TalentLayerData } from '@/lib/game/talent-types'
import { UI_KEYS } from '@/lib/i18n/ui-keys'
import HeroTalentPoint from './HeroTalentPoint'
import HeroTalentSkillCard from './HeroTalentSkillCard'

interface HeroTalentLayerProps {
  layer: TalentLayerData
  cumulativeAwakeningMaterials: ConsumeEntry[]
  visibleStats: string[]
  getT: (key?: string) => string
  valuesMap: Record<number, (string | number)[]>
  labelMap: Record<number, string>
  consumeRefMap: ConsumeRefMap
}

function formatHeroLevelLabel(level: number, getT: (key?: string) => string): string {
  const template = getT(UI_KEYS.common.heroLv)
  if (template.includes('{0}')) return template.replace('{0}', String(level))
  return `${template} ${level}`
}

export default function HeroTalentLayer({
  layer,
  cumulativeAwakeningMaterials,
  visibleStats,
  getT,
  valuesMap,
  labelMap,
  consumeRefMap,
}: HeroTalentLayerProps) {
  const [selectedPoint, setSelectedPoint] = useState(0)
  const activePoint = layer.points[selectedPoint]

  return (
    <div className="hero-talents-layer">
      {layer.unlock.length > 0 && (
        <section className="hero-talents-unlock">
          <h4 className="hero-talents-section__title">
            {getT(UI_KEYS.hero.talentUnlockTasks)}
          </h4>
          <ul className="hero-talents-unlock__list">
            {layer.unlock.map((req, i) => (
              <li key={`${req.type}-${i}`} className="hero-talents-unlock__item">
                <span className="hero-talents-unlock__dot" aria-hidden />
                <span>{formatUnlockRequirement(req.desc, req.value, getT)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="hero-talents-grid">
        <article className="hero-talents-panel">
          <header className="hero-talents-panel__head">
            <h4 className="hero-talents-section__title">
              {getT(UI_KEYS.hero.talentLevelUpTitle)}
              {layer.maxLevel > 0 ? (
                <span className="hero-talents-section__title-meta">
                  {' '}
                  ({formatHeroLevelLabel(layer.maxLevel, getT)})
                </span>
              ) : null}
            </h4>
          </header>

          <div
            className="hero-talents-points"
            role="listbox"
            aria-label={getT(UI_KEYS.hero.talentLevelUpTitle)}
          >
            {layer.points.map((point, idx) => {
              const isActive = idx === selectedPoint
              const pointLabel = `${getT(UI_KEYS.hero.talentLevelLabel)} ${point.index}`
              return (
                <button
                  key={point.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  aria-label={pointLabel}
                  title={pointLabel}
                  onClick={() => setSelectedPoint(idx)}
                  className={`hero-talents-point${isActive ? ' hero-talents-point--active' : ''}`}
                >
                  <img
                    src={talentPointIconPath(point.index)}
                    alt=""
                    className={TALENT_POINT_ICON_CLASS}
                    onError={(e) => {
                      e.currentTarget.dataset.unavailable = 'true'
                      e.currentTarget.src = IMAGE_UNAVAILABLE
                    }}
                  />
                </button>
              )
            })}
          </div>

          {activePoint ? (
            <HeroTalentPoint
              point={activePoint}
              visibleStats={visibleStats}
              getT={getT}
              consumeRefMap={consumeRefMap}
            />
          ) : null}
        </article>

        <article className="hero-talents-panel">
          <HeroTalentSkillCard
            layerSkill={layer.layerSkill}
            cumulativeMaterials={cumulativeAwakeningMaterials}
            getT={getT}
            valuesMap={valuesMap}
            labelMap={labelMap}
            consumeRefMap={consumeRefMap}
          />
        </article>
      </div>
    </div>
  )
}
