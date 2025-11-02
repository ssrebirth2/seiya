'use client'

import { useEffect, useState } from 'react'
import HeroSkillList from './HeroSkillList'
import HeroQualitySkill from './HeroQualitySkill'
import HeroAwakenSkills from './HeroAwakenSkills'
import HeroBonds from './HeroBonds'

interface HeroTabsContainerProps {
  heroId: number
  skillIds: (number | string)[]
  onTabsReady?: () => void // 🔹 callback pro pai (HeroProfilePage)
}

export default function HeroTabsContainer({ heroId, skillIds, onTabsReady }: HeroTabsContainerProps) {
  const [activeTab, setActiveTab] = useState<'skills' | 'quality' | 'awaken' | 'bonds'>('skills')
  const [isReady, setIsReady] = useState(false)

  // 🔹 Simula o carregamento inicial das abas
  useEffect(() => {
    const preload = async () => {
      // Aqui poderíamos aguardar chamadas async se necessário
      await new Promise((resolve) => setTimeout(resolve, 300)) // pequeno delay só pra sincronizar
      setIsReady(true)
      onTabsReady?.() // 🔹 notifica o pai que está pronto
    }
    preload()
  }, [])

  if (!isReady) {
    return (
      <div className="flex justify-center py-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[var(--text-muted)]">Preparando habilidades...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'skills', label: 'Skills' },
    { key: 'quality', label: 'Quality Skill' },
    { key: 'awaken', label: 'Awaken Skills' },
    { key: 'bonds', label: 'Bonds' },
  ]

  return (
    <section className="mt-0">
      {/* Cabeçalho das Tabs */}
      <div className="flex gap-4 border-b border-[var(--panel-border)] mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-regular font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-400 text-blue-400'
                : 'text-[var(--text-muted)] hover:text-blue-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das Tabs */}
      <div className="relative">
        <div className={activeTab === 'skills' ? 'block' : 'hidden'}>
          <HeroSkillList skillIds={skillIds} />
        </div>

        <div className={activeTab === 'quality' ? 'block' : 'hidden'}>
          <HeroQualitySkill heroId={heroId} />
        </div>

        <div className={activeTab === 'awaken' ? 'block' : 'hidden'}>
          <HeroAwakenSkills heroId={heroId} />
        </div>

        <div className={activeTab === 'bonds' ? 'block' : 'hidden'}>
          <HeroBonds heroId={heroId} />
        </div>
      </div>
    </section>
  )
}
