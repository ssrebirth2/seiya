'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'

// ==========================================================
// ✅ Tipagens dos componentes filhos
// ==========================================================
interface ForceCardProgressionProps {
  info: any
  starUps: any[]
  reborns?: any[]
}

interface ForceCardStatsProps {
  info: any
  levels: any[]
}

interface ForceCardAwakenProps {
  awakens: any[]
}

// ==========================================================
// ✅ Lazy loading com tipagem explícita
// ==========================================================
const ForceCardStats = dynamic<ForceCardStatsProps>(
  () => import('./ForceCardStats'),
  { ssr: false }
)
const ForceCardProgression = dynamic<ForceCardProgressionProps>(
  () => import('./ForceCardProgression'),
  { ssr: false }
)
const ForceCardAwaken = dynamic<ForceCardAwakenProps>(
  () => import('./ForceCardAwaken'),
  { ssr: false }
)

// ==========================================================
// 🧩 Tipagem do Container
// ==========================================================
interface ForceCardTabsContainerProps {
  info: any
  starUps: any[]
  levels: any[]
  awakens: any[]
  reborns?: any[]
}

type TabKey = 'progression' | 'stats' | 'awaken'

// ==========================================================
// 🪝 Hook: Carregamento unificado
// ==========================================================
function useForceCardDataReady(
  info: any,
  starUps: any[],
  levels: any[],
  awakens: any[],
  reborns?: any[]
) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const isValid = (arr: any[]) => Array.isArray(arr) && arr.length > 0
    const hasData =
      info &&
      Object.keys(info).length > 0 &&
      (isValid(starUps) ||
        isValid(levels) ||
        isValid(awakens) ||
        isValid(reborns ?? []))
    setReady(hasData)
  }, [info, starUps, levels, awakens, reborns])

  return ready
}

// ==========================================================
// 🧱 Componente Principal
// ==========================================================
export default function ForceCardTabsContainer({
  info,
  starUps,
  levels,
  awakens,
  reborns,
}: ForceCardTabsContainerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('progression')
  const isReady = useForceCardDataReady(info, starUps, levels, awakens, reborns)

  // 🔹 Persistência da aba ativa (localStorage)
  useEffect(() => {
    const storedTab = localStorage.getItem('forceCardActiveTab') as TabKey | null
    if (storedTab && ['progression', 'stats', 'awaken'].includes(storedTab)) {
      setActiveTab(storedTab)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('forceCardActiveTab', activeTab)
  }, [activeTab])

  const tabs = useMemo(
    () => [
      { key: 'progression' as TabKey, label: 'Progression' },
      { key: 'stats' as TabKey, label: 'Attributes' },
      { key: 'awaken' as TabKey, label: 'Awaken' },
    ],
    []
  )

  const handleTabClick = (key: TabKey) => {
    if (activeTab === key) return // evita re-render desnecessário
    setActiveTab(key)
  }

  // ==========================================================
  // 🔄 Estado de carregamento real
  // ==========================================================
  if (!isReady) {
    return (
      <div className="flex justify-center py-10">
        <div className="flex flex-col items-center gap-3">
          <div className="spinner h-6 w-6" />
          <p className="text-xs text-text-muted">
            Loading Force Card data...
          </p>
        </div>
      </div>
    )
  }

  // ==========================================================
  // 🧭 Tabs + Conteúdo (todas pré-carregadas)
  // ==========================================================
  return (
    <section>
      <nav
        className="border-b border-panel-border px-3 sm:px-4"
        role="tablist"
        aria-label="Force card details"
      >
        <div className="flex gap-1 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => handleTabClick(key)}
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
        <div className={activeTab === 'progression' ? 'block' : 'hidden'}>
          <ForceCardProgression info={info} starUps={starUps} reborns={reborns} />
        </div>

        <div className={activeTab === 'stats' ? 'block' : 'hidden'}>
          <ForceCardStats info={info} levels={levels} />
        </div>

        <div className={activeTab === 'awaken' ? 'block' : 'hidden'}>
          <ForceCardAwaken awakens={awakens} />
        </div>
      </div>
    </section>
  )
}
