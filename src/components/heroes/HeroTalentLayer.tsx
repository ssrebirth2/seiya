'use client'

import React, { useState } from 'react'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/game-images'
import { talentPointIconPath, TALENT_ICON_CLASS } from '@/lib/assets/talent-images'
import { formatUnlockRequirement } from '@/lib/game/format-talent-attribute'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import type { TalentLayerData } from '@/lib/game/talent-types'
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
    <div className="space-y-4">
      {layer.unlock.length > 0 && (
        <div className="rounded-lg border border-panel-border bg-panel-hover/50 p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Unlock requirements
          </h4>
          <ul className="space-y-1 text-sm">
            {layer.unlock.map((req, i) => (
              <li key={`${req.type}-${i}`} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{formatUnlockRequirement(req.desc, req.value, getT)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Talent points (max Lv {layer.maxLevel})
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:justify-start sm:gap-4">
            {layer.points.map((point, idx) => {
              const isActive = idx === selectedPoint
              return (
                <button
                  key={point.id}
                  type="button"
                  aria-label={`Talent point ${point.index}`}
                  title={`Point ${point.index}`}
                  onClick={() => setSelectedPoint(idx)}
                  className={`talent-point-btn rounded-xl border p-1 transition-colors ${
                    isActive ? 'talent-point-btn-active' : ''
                  }`}
                >
                  <img
                    src={talentPointIconPath(point.index)}
                    alt={`Point ${point.index}`}
                    className={TALENT_ICON_CLASS}
                    onError={(e) => {
                      e.currentTarget.dataset.unavailable = 'true'
                      e.currentTarget.src = IMAGE_UNAVAILABLE
                    }}
                  />
                </button>
              )
            })}
          </div>

          {activePoint && (
            <HeroTalentPoint
              point={activePoint}
              visibleStats={visibleStats}
              getT={getT}
              consumeRefMap={consumeRefMap}
            />
          )}
        </div>

        <div className="order-1 lg:order-2">
          <HeroTalentSkillCard
            layerSkill={layer.layerSkill}
            cumulativeMaterials={cumulativeAwakeningMaterials}
            getT={getT}
            valuesMap={valuesMap}
            labelMap={labelMap}
            consumeRefMap={consumeRefMap}
          />
        </div>
      </div>
    </div>
  )
}
