'use client'

import { useEffect, useMemo, useState } from 'react'
import HeroOverview from './HeroOverview'
import HeroSkillList from './HeroSkillList'
import HeroBonds from './HeroBonds'
import HeroTalents from './HeroTalents'
import HeroCosmo from './HeroCosmo'
import { Tabs, type TabItem } from '@/components/ui/v2/Tabs'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { heroHasCosmo } from '@/lib/game/load-hero-cosmo'

interface HeroTabsContainerProps {
  heroId: number
  skillIds: (number | string)[]
  roleIntroduction?: string | null
  roleFeatures?: string | null
  getT?: (key: string) => string
  onTabsReady?: () => void
}

type TabKey = 'overview' | 'skills' | 'talents' | 'bonds' | 'cosmo'

export default function HeroTabsContainer({
  heroId,
  skillIds,
  roleIntroduction,
  roleFeatures,
  getT,
}: HeroTabsContainerProps) {
  const { t } = useUiTranslation()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [hasCosmo, setHasCosmo] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    heroHasCosmo(heroId).then((ok) => {
      if (!cancelled) setHasCosmo(ok)
    })
    return () => {
      cancelled = true
    }
  }, [heroId])

  const overviewPanel = useMemo(
    () => (
      <HeroOverview
        heroId={heroId}
        roleIntroduction={roleIntroduction}
        roleFeatures={roleFeatures}
        getT={getT}
      />
    ),
    [heroId, roleIntroduction, roleFeatures, getT]
  )
  const skillsPanel = useMemo(
    () => <HeroSkillList heroId={heroId} skillIds={skillIds} />,
    [heroId, skillIds]
  )
  const talentsPanel = useMemo(() => <HeroTalents heroId={heroId} />, [heroId])
  const bondsPanel = useMemo(() => <HeroBonds heroId={heroId} />, [heroId])
  const cosmoPanel = useMemo(() => <HeroCosmo heroId={heroId} />, [heroId])

  const tabs = useMemo(() => {
    const items: TabItem[] = [
      {
        id: 'overview' as TabKey,
        label: t(UI_KEYS.hero.overviewTab),
        panel: overviewPanel,
      },
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
    ]
    if (hasCosmo) {
      items.push({
        id: 'cosmo' as TabKey,
        label: t(UI_KEYS.hero.cosmoTab),
        panel: cosmoPanel,
      })
    }
    return items
  }, [t, overviewPanel, skillsPanel, talentsPanel, bondsPanel, cosmoPanel, hasCosmo])

  return (
    <Tabs
      tabs={tabs}
      activeId={activeTab}
      onChange={(id) => setActiveTab(id as TabKey)}
      panelOverflow="visible"
      ariaLabel={t(UI_KEYS.hero.saintInfo)}
    />
  )
}
