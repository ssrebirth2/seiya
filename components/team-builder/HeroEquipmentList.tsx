'use client'

import { useEffect, useState } from 'react'
import { useTeamStore } from './useTeamStore'
import { useEquipmentStore } from './useEquipmentStore'
import HeroEquipmentRow from './HeroEquipmentRow'
import { canEquipCard } from './loadForceCards'
import { canEquipArtifact } from './loadArtifacts'
import { supabase } from '@/lib/supabase'

export default function HeroEquipmentList({ readOnly = false }: { readOnly?: boolean }) {
  const { team } = useTeamStore()
  const {
    equipArtifact,
    removeArtifact,
    equipCard,
    removeCard,
    allForceCards,
    allArtifacts,
    loadAllData,
  } = useEquipmentStore()

  const [heroesInfo, setHeroesInfo] = useState<Record<number, any>>({})

  // ============================================================
  // 1️⃣ Carrega os dados fixos (Force Cards e Artifacts) apenas uma vez
  // ============================================================
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // ============================================================
  // 2️⃣ Carrega informações dos heróis (RoleConfig)
  // ============================================================
  useEffect(() => {
    if (!team.length) return
    const loadHeroesInfo = async () => {
      const heroIds = team.map((h) => h.id)
      const { data } = await supabase
        .from('RoleConfig')
        .select('id, stance, camp, occupation, damagetype')
        .in('id', heroIds)
      const map: Record<number, any> = {}
      data?.forEach((r) => (map[r.id] = r))
      setHeroesInfo(map)
    }
    loadHeroesInfo()
  }, [team])

  // ============================================================
  // 3️⃣ Renderiza os heróis principais
  // ============================================================
  const mainHeroes = team.filter((h) => h.stance !== 0)

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Hero Equipment</h3>

      <div className="space-y-3">
        {mainHeroes.map((hero) => (
          <HeroEquipmentRow
            key={hero.id}
            hero={hero}
            readOnly={readOnly} // ✅ novo modo leitura
            cards={allForceCards.filter((c) =>
              heroesInfo[hero.id] ? canEquipCard(heroesInfo[hero.id], c) : true
            )}
            artifacts={allArtifacts.filter((a) =>
              heroesInfo[hero.id] ? canEquipArtifact(heroesInfo[hero.id], a) : true
            )}
            onEquipCard={(cardId) => equipCard(hero.id, cardId)}
            onRemoveCard={(cardId) => removeCard(hero.id, cardId)}
            onEquipArtifact={(artifactId) => equipArtifact(hero.id, artifactId)}
            onRemoveArtifact={() => removeArtifact(hero.id)}
          />
        ))}
      </div>
    </div>
  )
}
