'use client'

import { create } from 'zustand'
import LZString from 'lz-string'

// ============================================================
// 🔹 Types
// ============================================================
type HeroSlot = {
  id: number
  stance: number        // 1=front, 2=mid, 3=back, 0=support
  baseStance: number    // original stance (1..3)
  position: string      // e.g., 'front-0', 'support-0'
}

type TeamStore = {
  team: HeroSlot[]
  addHero: (hero: { id: number; stance: number }) => void
  removeHero: (position: string) => void
  swapHeroes: (posA: string, posB: string) => void
  rebalanceRow: (stance: number) => void
  clearTeam: () => void
  loadFromCode: (code: string) => void
  setTeam: (team: HeroSlot[]) => void
  exportCode: () => string
}

// ============================================================
// 🧠 Helper functions
// ============================================================
const stanceLabel = (stance: number): string =>
  stance === 0 ? 'support'
  : stance === 1 ? 'front'
  : stance === 2 ? 'mid'
  : 'back'

const positionsByStance = (stance: number): string[] => {
  const label = stanceLabel(stance)
  return stance === 0
    ? [`${label}-0`, `${label}-1`]
    : [`${label}-0`, `${label}-1`, `${label}-2`]
}

const balancedInsertPos = (existing: HeroSlot[], stance: number): string => {
  const label = stanceLabel(stance)
  const slots = positionsByStance(stance)
  if (existing.length === 0) return `${label}-1`
  if (existing.length === 1)
    return existing[0].position === `${label}-1` ? `${label}-0` : `${label}-2`
  const occupied = new Set(existing.map((h) => h.position))
  return slots.find((s) => !occupied.has(s)) || `${label}-1`
}

/** Rebalances only the given stance row, leaving others unchanged */
const rebalanceRowLocal = (team: HeroSlot[], stance: number): HeroSlot[] => {
  const label = stanceLabel(stance)
  const slots = positionsByStance(stance)
  const row = team.filter((h) => h.stance === stance)

  if (row.length === 1) row[0].position = `${label}-1`
  else if (row.length === 2) {
    row[0].position = `${label}-0`
    row[1].position = `${label}-2`
  } else if (row.length === 3) {
    row.forEach((h, i) => (h.position = slots[i]))
  }

  const others = team.filter((h) => h.stance !== stance)
  return [...others, ...row]
}

const isSupportPos = (pos: string) => pos.startsWith('support')

// ============================================================
// 🧩 Zustand Store
// ============================================================
export const useTeamStore = create<TeamStore>((set, get) => ({
  team: [],

  // ------------------------------------------------------------
  // ➕ Add hero with automatic balancing
  // ------------------------------------------------------------
  addHero: (hero) =>
    set((state) => {
      const team = [...state.team]
      if (team.some((h) => h.id === hero.id)) return state

      const mains = team.filter((h) => h.stance !== 0)
      const supports = team.filter((h) => h.stance === 0)
      const row = mains.filter((h) => h.stance === hero.stance)

      if (row.length >= 3) {
        if (supports.length < 2) {
          const available = positionsByStance(0)
          const occupied = new Set(supports.map((h) => h.position))
          const free = available.find((p) => !occupied.has(p))
          if (free) {
            team.push({
              id: hero.id,
              stance: 0,
              baseStance: hero.stance,
              position: free,
            })
            return { team }
          }
        }
        alert('The team is full!')
        return state
      }

      if (mains.length >= 5) {
        if (supports.length < 2) {
          const available = positionsByStance(0)
          const occupied = new Set(supports.map((h) => h.position))
          const free = available.find((p) => !occupied.has(p))
          if (free) {
            team.push({
              id: hero.id,
              stance: 0,
              baseStance: hero.stance,
              position: free,
            })
            return { team }
          }
        }
        alert('The team is full!')
        return state
      }

      const pos = balancedInsertPos(row, hero.stance)
      team.push({
        id: hero.id,
        stance: hero.stance,
        baseStance: hero.stance,
        position: pos,
      })
      return { team: rebalanceRowLocal(team, hero.stance) }
    }),

  // ------------------------------------------------------------
  // ❌ Remove hero
  // ------------------------------------------------------------
  removeHero: (position) =>
    set((state) => {
      const team = [...state.team]
      const removed = team.find((h) => h.position === position)
      if (!removed) return { team }

      const updated = team.filter((h) => h.id !== removed.id)
      if (removed.stance !== 0)
        return { team: rebalanceRowLocal(updated, removed.stance) }
      return { team: updated }
    }),

  // ------------------------------------------------------------
  // 🔁 Swap heroes
  // ------------------------------------------------------------
  swapHeroes: (posA, posB) =>
    set((state) => {
      let team = [...state.team]
      const heroA = team.find((h) => h.position === posA)
      const heroB = team.find((h) => h.position === posB)
      if (!heroA) return state

      const mains = team.filter((h) => h.stance !== 0)
      const supports = team.filter((h) => h.stance === 0)

      const canEnterMain = (stance: number): boolean => {
        const mainsNow = team.filter((h) => h.stance !== 0)
        const rowNow = mainsNow.filter((h) => h.stance === stance)
        return mainsNow.length < 5 && rowNow.length < 3
      }

      // Support → Main
      if (heroA.stance === 0 && !isSupportPos(posB)) {
        const targetStance = heroA.baseStance || 1
        const rowTarget = team.filter((h) => h.stance === targetStance)
        const mainsCount = mains.length

        if (mainsCount >= 5 && !heroB)
          return { team: team.filter((h) => h.id !== heroA.id) }

        if (heroB) {
          const bPrevStance = heroB.stance
          const sameStanceSwap = heroB.stance === targetStance
          const rowFree = rowTarget.length < 3
          if (!rowFree && !sameStanceSwap) return state

          heroB.stance = 0
          heroB.baseStance = heroB.baseStance || bPrevStance || 1
          heroB.position = posA

          heroA.stance = targetStance
          heroA.baseStance = targetStance
          heroA.position = balancedInsertPos(
            team.filter((h) => h.stance === targetStance && h.id !== heroB.id),
            targetStance
          )

          team = rebalanceRowLocal(team, targetStance)
          if (bPrevStance !== 0) team = rebalanceRowLocal(team, bPrevStance)
          return { team }
        }

        if (mainsCount < 5 && rowTarget.length < 3) {
          heroA.stance = targetStance
          heroA.baseStance = targetStance
          heroA.position = balancedInsertPos(rowTarget, targetStance)
          team = rebalanceRowLocal(team, targetStance)
          return { team }
        }

        return { team: team.filter((h) => h.id !== heroA.id) }
      }

      // Main → Support
      if (heroA.stance !== 0 && isSupportPos(posB)) {
        const slotOccupied = !!heroB

        if (!slotOccupied) {
          if (supports.length >= 2)
            return { team: team.filter((h) => h.id !== heroA.id) }

          const fromStance = heroA.stance
          heroA.stance = 0
          heroA.position = posB
          team = rebalanceRowLocal(team, fromStance)
          return { team }
        }

        if (heroB && heroB.stance === 0) {
          const targetStance = heroB.baseStance || 1
          const rowTarget = team.filter((h) => h.stance === targetStance)
          const sameStanceSwap = heroA.stance === targetStance
          const rowFree = rowTarget.length < 3
          if (!rowFree && !sameStanceSwap) return state

          heroB.stance = targetStance
          heroB.baseStance = targetStance
          heroB.position = balancedInsertPos(
            team.filter((h) => h.stance === targetStance && h.id !== heroA.id),
            targetStance
          )

          const fromStance = heroA.stance
          heroA.stance = 0
          heroA.position = posB

          team = rebalanceRowLocal(team, fromStance)
          team = rebalanceRowLocal(team, targetStance)
          return { team }
        }
      }

      if (heroA && heroB && heroA.stance === heroB.stance) {
        heroA.position = posB
        heroB.position = posA
        return { team }
      }

      if (heroA.stance === 0 && heroB?.stance === 0) {
        heroA.position = posB
        heroB.position = posA
        return { team }
      }

      return { team }
    }),

  rebalanceRow: (stance) =>
    set((state) => {
      if (stance === 0) return state
      const team = rebalanceRowLocal([...state.team], stance)
      return { team }
    }),

  clearTeam: () => set({ team: [] }),

  // ============================================================
  // ✅ loadFromCode: suporta LZString + base64 antigo
  // ============================================================
  loadFromCode: (code: string) => {
  try {
    if (!code || typeof code !== 'string') {
      console.warn('Invalid code for loadFromCode:', code)
      return
    }

    let json: string | null = null

    // tenta LZString (novo formato)
    try {
      json = LZString.decompressFromEncodedURIComponent(code)
    } catch {
      json = null
    }

    if (json) {
      const obj = JSON.parse(json)
      if (Array.isArray(obj)) {
        set({ team: obj })
      } else if (obj.team) {
        set({ team: obj.team })
      }
      return
    }

    // fallback base64 (antigo)
    const legacyStr = atob(code)
    const legacy = JSON.parse(legacyStr)
    if (Array.isArray(legacy)) set({ team: legacy })
  } catch (err) {
    console.error('Error loading team:', err)
  }
},


  setTeam: (team) => set({ team }),

  exportCode: () => btoa(JSON.stringify(get().team)),
}))
