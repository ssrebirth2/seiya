'use client'

import { useState, useMemo } from 'react'
import HeroSkillList from './HeroSkillList'
import HeroQualitySkill from './HeroQualitySkill'
import HeroAwakenSkills from './HeroAwakenSkills'
import HeroBonds from './HeroBonds'
import HeroTalents from './HeroTalents'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

interface HeroTabsContainerProps {
  heroId: number
  skillIds: (number | string)[]
  onTabsReady?: () => void
}

type TabKey = 'skills' | 'quality' | 'awaken' | 'talents' | 'bonds'

export default function HeroTabsContainer({ heroId, skillIds }: HeroTabsContainerProps) {
  const { t } = useUiTranslation()
  const [activeTab, setActiveTab] = useState<TabKey>('skills')

  const tabs = useMemo(
    () =>
      [
        { key: 'skills' as TabKey, label: t(UI_KEYS.hero.skillsTab) },
        { key: 'quality' as TabKey, label: t(UI_KEYS.hero.qualitySkillTab) },
        { key: 'awaken' as TabKey, label: t(UI_KEYS.hero.awakenTab) },
        { key: 'talents' as TabKey, label: t(UI_KEYS.hero.talentsTab) },
        { key: 'bonds' as TabKey, label: t(UI_KEYS.hero.bondsTab) },
      ] as const,
    [t]
  )

  return (
    <section>
      <div
        className="border-b border-panel-border px-3 sm:px-4"
        role="tablist"
        aria-label={t(UI_KEYS.hero.saintInfo)}
      >
        <div className="flex gap-1 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
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
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-w-0 p-4 sm:p-6">
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
          aria-hidden={activeTab !== 'talents'}
          className={activeTab === 'talents' ? 'block' : 'hidden'}
        >
          <HeroTalents heroId={heroId} />
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
