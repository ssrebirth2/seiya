'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

interface ForceCardProgressionProps {
  starUps: any[]
  awakens?: any[]
  cardQuality?: number
}

interface ForceCardStatsProps {
  info: any
  levels: any[]
}

interface ForceCardRebornProps {
  reborns: any[]
  cardQuality?: number
}

const ForceCardStats = dynamic<ForceCardStatsProps>(() => import('./ForceCardStats'), {
  ssr: false,
})
const ForceCardProgression = dynamic<ForceCardProgressionProps>(
  () => import('./ForceCardProgression'),
  { ssr: false }
)
const ForceCardReborn = dynamic<ForceCardRebornProps>(() => import('./ForceCardReborn'), {
  ssr: false,
})

interface ForceCardTabsContainerProps {
  info: any
  starUps: any[]
  levels: any[]
  awakens: any[]
  reborns?: any[]
  cardQuality?: number
}

type TabKey = 'progression' | 'stats' | 'reborn'

export default function ForceCardTabsContainer({
  info,
  starUps,
  levels,
  awakens,
  reborns = [],
  cardQuality,
}: ForceCardTabsContainerProps) {
  const { t } = useUiTranslation()
  const [activeTab, setActiveTab] = useState<TabKey>('progression')

  const hasStarUps = Array.isArray(starUps) && starUps.length > 0
  const hasLevels = Array.isArray(levels) && levels.length > 0
  const hasAwakens = Array.isArray(awakens) && awakens.length > 0
  const hasReborns = Array.isArray(reborns) && reborns.length > 0
  const hasProgression = hasStarUps || hasAwakens

  const tabs = useMemo(() => {
    const list: { key: TabKey; label: string }[] = []
    if (hasProgression) list.push({ key: 'progression', label: t(UI_KEYS.forceCard.progressionTab) })
    if (hasLevels) list.push({ key: 'stats', label: t(UI_KEYS.forceCard.attributesTab) })
    if (hasReborns) list.push({ key: 'reborn', label: t(UI_KEYS.forceCard.rebornTab) })
    return list
  }, [hasProgression, hasLevels, hasReborns, t])

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(tabs[0]?.key ?? 'progression')
    }
  }, [tabs, activeTab])

  useEffect(() => {
    const storedTab = localStorage.getItem('forceCardActiveTab') as TabKey | null
    if (storedTab && tabs.some((tab) => tab.key === storedTab)) {
      setActiveTab(storedTab)
    }
  }, [tabs])

  useEffect(() => {
    localStorage.setItem('forceCardActiveTab', activeTab)
  }, [activeTab])

  if (!tabs.length) {
    return (
      <section className="panel text-center text-sm text-text-muted">
        {t(UI_KEYS.forceCard.noProgressionData)}
      </section>
    )
  }

  return (
    <section className="surface panel overflow-hidden !p-0">
      <nav
        className="detail-tabs-sticky border-b border-panel-border px-4"
        role="tablist"
        aria-label={t(UI_KEYS.forceCard.cardDetail)}
      >
        <div className="flex scroll-strip-h scroll-fade-x gap-1 pb-px">
          {tabs.map(({ key, label }) => (
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

      <div className="relative min-h-[240px] p-4">
        <div className={activeTab === 'progression' ? 'block' : 'hidden'}>
          <ForceCardProgression starUps={starUps} awakens={awakens} cardQuality={cardQuality} />
        </div>

        <div className={activeTab === 'stats' ? 'block' : 'hidden'}>
          <ForceCardStats info={info} levels={levels} />
        </div>

        <div className={activeTab === 'reborn' ? 'block' : 'hidden'}>
          <ForceCardReborn reborns={reborns} cardQuality={cardQuality} />
        </div>
      </div>
    </section>
  )
}
