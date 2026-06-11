'use client'

import { create } from 'zustand'
import { getQueryClient } from '@/lib/query/query-client'
import { fetchRawEquipmentCatalog } from '@/lib/query/fetchers/equipment-catalog'
import { queryKeys } from '@/lib/query/query-keys'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'
import { isAssetAvailable } from '@/lib/assets/asset-registry'

type Equipment = {
  artifact: number | null
  cards: number[]
}

type EquipmentStore = {
  equipment: Record<number, Equipment>
  allForceCards: any[]
  allArtifacts: any[]
  loaded: boolean
  equipArtifact: (heroId: number, artifactId: number) => void
  removeArtifact: (heroId: number) => void
  equipCard: (heroId: number, cardId: number) => void
  removeCard: (heroId: number, cardId: number) => void
  replaceCard: (heroId: number, slot: number, newCardId: number) => void
  clearHero: (heroId: number) => void
  getAll: () => Record<number, Equipment>
  loadAllData: () => Promise<void>
}

export const useEquipmentStore = create<EquipmentStore>((set, get) => ({
  equipment: {},
  allForceCards: [],
  allArtifacts: [],
  loaded: false,

  // ============================================================
  // 🔹 Artefato
  // ============================================================
  equipArtifact: (heroId, artifactId) =>
    set((s) => ({
      equipment: {
        ...s.equipment,
        [heroId]: { artifact: artifactId, cards: s.equipment[heroId]?.cards || [] },
      },
    })),

  removeArtifact: (heroId) =>
    set((s) => ({
      equipment: {
        ...s.equipment,
        [heroId]: { artifact: null, cards: s.equipment[heroId]?.cards || [] },
      },
    })),

  // ============================================================
  // 🔹 Cartas
  // ============================================================
  equipCard: (heroId, cardId) =>
    set((s) => {
      const cards = s.equipment[heroId]?.cards || []
      if (cards.includes(cardId)) return s
      const newCards = cards.length < 5 ? [...cards, cardId] : cards
      return {
        equipment: {
          ...s.equipment,
          [heroId]: {
            artifact: s.equipment[heroId]?.artifact || null,
            cards: newCards,
          },
        },
      }
    }),

  removeCard: (heroId, cardId) =>
    set((s) => ({
      equipment: {
        ...s.equipment,
        [heroId]: {
          artifact: s.equipment[heroId]?.artifact || null,
          cards: s.equipment[heroId]?.cards.filter((c) => c !== cardId) || [],
        },
      },
    })),

  // ✅ Substitui carta em slot específico
  replaceCard: (heroId, slot, newCardId) =>
    set((s) => {
      const cards = [...(s.equipment[heroId]?.cards || [])]
      if (slot < 0 || slot >= 5) return s
      cards[slot] = newCardId
      return {
        equipment: {
          ...s.equipment,
          [heroId]: {
            artifact: s.equipment[heroId]?.artifact || null,
            cards,
          },
        },
      }
    }),

  // ============================================================
  // 🔹 Limpa dados do herói
  // ============================================================
  clearHero: (heroId) =>
    set((s) => ({
      equipment: { ...s.equipment, [heroId]: { artifact: null, cards: [] } },
    })),

  getAll: () => get().equipment,

  // ============================================================
  // 🔹 Carrega Force Cards e Artefatos (filtrando imagens válidas)
  // ============================================================
  loadAllData: async () => {
    const { loaded } = get()
    if (loaded) return // evita requisições repetidas

    try {
      console.time('⏳ Equipment load')

      const qc = getQueryClient()
      const { forceCards, artifacts } = await qc.fetchQuery({
        queryKey: queryKeys.equipmentCatalogRaw,
        queryFn: fetchRawEquipmentCatalog,
        staleTime: GAME_CONFIG_STALE_MS,
      })

      const validCards = forceCards.filter((c) =>
        isAssetAvailable(`/assets/resources/textures/dynamis/card/Card_small_${c.id}.png`)
      )

      const validArtifacts = artifacts.filter((a) =>
        isAssetAvailable(
          `/assets/resources/textures/artifact/artifactskill/skillicon/SkillIcon_${a.id}00.png`
        )
      )

      console.timeEnd('⏳ Equipment load')
      console.log(`✅ Equipment data loaded: ${validCards.length} cards, ${validArtifacts.length} artifacts`)

      set({
        allForceCards: validCards,
        allArtifacts: validArtifacts,
        loaded: true,
      })
    } catch (err) {
      console.error('⚠️ useEquipmentStore.loadAllData failed:', err)
    }
  },
}))
