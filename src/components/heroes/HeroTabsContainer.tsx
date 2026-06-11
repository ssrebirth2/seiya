'use client'

import { useState } from 'react'
import HeroSkillList from './HeroSkillList'
import HeroQualitySkill from './HeroQualitySkill'
import HeroAwakenSkills from './HeroAwakenSkills'
import HeroBonds from './HeroBonds'

interface HeroTabsContainerProps {
  heroId: number
  skillIds: (number | string)[]
  onTabsReady?: () => void
}

type TabKey = 'skills' | 'quality' | 'awaken' | 'bonds'

const TABS: { key: TabKey; label: string; shortLabel: string }[] = [
  { key: 'skills', label: 'Skills', shortLabel: 'Skills' },
  { key: 'quality', label: 'Quality Skill', shortLabel: 'Quality' },
  { key: 'awaken', label: 'Awaken Skills', shortLabel: 'Awaken' },
  { key: 'bonds', label: 'Bonds', shortLabel: 'Bonds' },
]

export default function HeroTabsContainer({ heroId, skillIds }: HeroTabsContainerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('skills')

  return (
    <section>
      <div
        className="border-b border-panel-border px-3 sm:px-4"
        role="tablist"
        aria-label="Hero details"
      >
        <div className="flex gap-1 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                className={`tab-btn ${isActive ? 'tab-btn-active' : 'tab-btn-inactive'}`}
              >
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Keep panels mounted so tab switches don't re-fetch from Supabase */}
        <div
          role="tabpanel"
          aria-hidden={activeTab !== 'skills'}
          className={activeTab === 'skills' ? 'block' : 'hidden'}
        >
          <HeroSkillList skillIds={skillIds} />
        </div>
        <div
          role="tabpanel"
          aria-hidden={activeTab !== 'quality'}
          className={activeTab === 'quality' ? 'block' : 'hidden'}
        >
          <HeroQualitySkill heroId={heroId} />
        </div>
        <div
          role="tabpanel"
          aria-hidden={activeTab !== 'awaken'}
          className={activeTab === 'awaken' ? 'block' : 'hidden'}
        >
          <HeroAwakenSkills heroId={heroId} />
        </div>
        <div
          role="tabpanel"
          aria-hidden={activeTab !== 'bonds'}
          className={activeTab === 'bonds' ? 'block' : 'hidden'}
        >
          <HeroBonds heroId={heroId} />
        </div>
      </div>
    </section>
  )
}
