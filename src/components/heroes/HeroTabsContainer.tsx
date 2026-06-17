'use client'

import { useMemo, useState } from 'react'
import HeroSkillList from './HeroSkillList'
import HeroBonds from './HeroBonds'
import HeroTalents from './HeroTalents'
import { Tabs, type TabItem } from '@/components/ui/v2/Tabs'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

interface HeroTabsContainerProps {
  heroId: number
  skillIds: (number | string)[]
  onTabsReady?: () => void
}

type TabKey = 'skills' | 'talents' | 'bonds'

export default function HeroTabsContainer({ heroId, skillIds }: HeroTabsContainerProps) {
  const { t } = useUiTranslation()
  const [activeTab, setActiveTab] = useState<TabKey>('skills')

  const skillsPanel = useMemo(
    () => <HeroSkillList heroId={heroId} skillIds={skillIds} />,
    [heroId, skillIds]
  )
  const talentsPanel = useMemo(() => <HeroTalents heroId={heroId} />, [heroId])
  const bondsPanel = useMemo(() => <HeroBonds heroId={heroId} />, [heroId])

  const tabs = useMemo(
    () =>
      [
        {
          id: 'skills' as TabKey,
          label: t(UI_KEYS.hero.skillsTab),
          panel: skillsPanel,
        },
        {
          id: 'talents' as TabKey,
          label: t(UI_KEYS.hero.talentsTab),
          panel: talentsPanel,
        },
        {
          id: 'bonds' as TabKey,
          label: t(UI_KEYS.hero.bondsTab),
          panel: bondsPanel,
        },
      ] as TabItem[],
    [t, skillsPanel, talentsPanel, bondsPanel]
  )

  return (
    <Tabs
      tabs={tabs}
      activeId={activeTab}
      onChange={(id) => setActiveTab(id as TabKey)}
      sticky
      panelOverflow="visible"
      ariaLabel={t(UI_KEYS.hero.saintInfo)}
    />
  )
}
