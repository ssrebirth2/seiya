'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

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

      const [cardsRes, infoRes, artifactsRes] = await Promise.all([
        supabase.from('ForceCardItemConfig').select('id, name, quality'),
        supabase.from('ForceCardInfoConfig').select('id, condition'),
        supabase.from('ArtifactConfig').select('id, name, initial_quality, limit'),
      ])

      // 🔹 Map de informações complementares
      const infoMap: Record<number, any> = {}
      infoRes.data?.forEach((r) => (infoMap[r.id] = r))

      let forceCards = (cardsRes.data || []).map((c) => ({
        ...c,
        condition: infoMap[c.id]?.condition || null,
      }))
      let artifacts = artifactsRes.data || []

      // ============================================================
      // 🔍 Verifica existência real das imagens e filtra inválidos
      // ============================================================
      const imageExists = async (src: string): Promise<boolean> =>
        new Promise((resolve) => {
          const img = new Image()
          img.onload = () => resolve(true)
          img.onerror = () => resolve(false)
          img.src = src
        })

      const validCards: any[] = []
      for (const c of forceCards) {
        const exists = await imageExists(`/assets/resources/textures/dynamis/card/Card_small_${c.id}.png`)
        if (exists) validCards.push(c)
      }

      const validArtifacts: any[] = []
      for (const a of artifacts) {
        const exists = await imageExists(
          `/assets/resources/textures/artifact/artifactskill/skillicon/SkillIcon_${a.id}00.png`
        )
        if (exists) validArtifacts.push(a)
      }

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
