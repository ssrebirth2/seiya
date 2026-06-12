'use client'

import { useState } from 'react'
import CompanionStats from './CompanionStats'
import CompanionProgression from './CompanionProgression'
import CompanionMaterial from './CompanionMaterial'

type SpiritAttrRow = {
  id: number
  spirit_attribute: unknown
  spirit_foundation_attribute: unknown
}

type StarRangeRow = {
  id: number
  star_min: number
  star_max: number
  skill_level?: number
  lv_max?: number
  spirit_team_attribute?: unknown
  spirit_team_attribute_percent?: unknown
  spirit_team_attribute_sum?: unknown
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

type CompanionTabsContainerProps = {
  initQuality: number
  scoreMin?: number
  scoreMax?: number
  attrRows: SpiritAttrRow[]
  starIndexes: StarIndexRow[]
  starConfigs: Record<number, StarRangeRow>
  riseQuality: RiseQualityRow[]
  starLoss: StarLossRow[]
  maxLevel: number
  getT: (key?: string) => string
}

type TabKey = 'stats' | 'progression' | 'material'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'stats', label: 'Stats' },
  { key: 'progression', label: 'Progression' },
  { key: 'material', label: 'Material' },
]

export default function CompanionTabsContainer({
  initQuality,
  scoreMin,
  scoreMax,
  attrRows,
  starIndexes,
  starConfigs,
  riseQuality,
  starLoss,
  maxLevel,
  getT,
}: CompanionTabsContainerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('stats')

  const starIndexForQuality = starIndexes.find((s) => s.id === initQuality)
  const starList = starIndexForQuality?.list ?? []

  return (
    <section>
      <nav
        className="border-b border-panel-border px-3 sm:px-4"
        role="tablist"
        aria-label="Companion details"
      >
        <div className="flex gap-1 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={`tab-btn shrink-0 whitespace-nowrap ${
                activeTab === key ? 'tab-btn-active' : 'tab-btn-inactive'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <div className="relative min-h-[240px] p-4 sm:p-6">
        <div className={activeTab === 'stats' ? 'block' : 'hidden'}>
          <CompanionStats
            initQuality={initQuality}
            attrRows={attrRows}
            starIndexList={starList}
            starConfigs={starConfigs}
            maxLevel={maxLevel}
          />
        </div>

        <div className={activeTab === 'progression' ? 'block' : 'hidden'}>
          <CompanionProgression
            starIndexes={starIndexes}
            starConfigs={starConfigs}
            riseQuality={riseQuality}
            starLoss={starLoss}
            getT={getT}
          />
        </div>

        <div className={activeTab === 'material' ? 'block' : 'hidden'}>
          <CompanionMaterial scoreMin={scoreMin} scoreMax={scoreMax} />
        </div>
      </div>
    </section>
  )
}
