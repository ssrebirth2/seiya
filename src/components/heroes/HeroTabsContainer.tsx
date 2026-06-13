'use client'

import { useState, useMemo } from 'react'
import HeroSkillList from './HeroSkillList'
import HeroQualitySkill from './HeroQualitySkill'
import HeroAwakenSkills from './HeroAwakenSkills'
import HeroBonds from './HeroBonds'
import HeroTalents from './HeroTalents'
import { Tabs, type TabItem } from '@/components/ui/v2/Tabs'
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
        {
          id: 'skills' as TabKey,
          label: t(UI_KEYS.hero.skillsTab),
          panel: <HeroSkillList skillIds={skillIds} />,
        },
        {
          id: 'quality' as TabKey,
          label: t(UI_KEYS.hero.qualitySkillTab),
          panel: <HeroQualitySkill heroId={heroId} />,
        },
        {
          id: 'awaken' as TabKey,
          label: t(UI_KEYS.hero.awakenTab),
          panel: <HeroAwakenSkills heroId={heroId} />,
        },
        {
          id: 'talents' as TabKey,
          label: t(UI_KEYS.hero.talentsTab),
          panel: <HeroTalents heroId={heroId} />,
        },
        {
          id: 'bonds' as TabKey,
          label: t(UI_KEYS.hero.bondsTab),
          panel: <HeroBonds heroId={heroId} />,
        },
      ] as TabItem[],
    [t, heroId, skillIds]
  )

  return (
    <Tabs
      tabs={tabs}
      activeId={activeTab}
      onChange={(id) => setActiveTab(id as TabKey)}
      sticky
      ariaLabel={t(UI_KEYS.hero.saintInfo)}
    />
  )
}
