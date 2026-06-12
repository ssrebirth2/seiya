'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import TeamGrid from '@/components/team-builder/TeamGrid'
import HeroPool from '@/components/team-builder/HeroPool'
import FilterBar from '@/components/team-builder/FilterBar'
import TeamActiveBonds from '@/components/team-builder/TeamActiveBonds'
import ShareButton from '@/components/team-builder/ShareButton'
import { decodeTeam } from '@/lib/team-builder/team-share-codec'
import { useTeamStore } from '@/lib/team-builder/stores/use-team-store'
import { useEquipmentStore } from '@/lib/team-builder/stores/use-equipment-store'
import HeroEquipmentList from '@/components/team-builder/HeroEquipmentList'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type HeroRow = {
  id: number
  stance: number
  camp: number
  occupation: number
  damagetype: number
  quality: number
}

export default function TeamBuilderPage() {
  const { t, site } = useUiTranslation()
  const [heroes, setHeroes] = useState<HeroRow[]>([])
  const [filtered, setFiltered] = useState<HeroRow[]>([])
  const [filters, setFilters] = useState({
    camp: '',
    stance: '',
    damagetype: '',
    occupation: '',
    quality: '',
  })

  const { clearTeam } = useTeamStore()
  const [sharedTeam, setSharedTeam] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)

  const isReadOnly = !!sharedTeam

  // ============================================================
  // 🔹 Load heroes + detect shared link (RODAR SÓ UMA VEZ)
  // ============================================================
  useEffect(() => {
    const loadAll = async () => {
      try {
        // 1) Carrega heróis
        const { data, error } = await supabase
          .from('RoleConfig')
          .select('id, stance, camp, occupation, damagetype, quality')
          .lte('id', 1499)
          .order('id', { ascending: true })

        if (error) throw error

        const rows = (data || []) as HeroRow[]
        setHeroes(rows)
        setFiltered(rows)

        // 2) Detecta link compartilhado (novo e legado)
        let decoded: any | null = null
        const hash = window.location.hash?.replace(/^#/, '')
        if (hash) decoded = decodeTeam(hash)

        if (!decoded) {
          const match = window.location.pathname.match(/team-builder\/([^/]+)/)
          if (match && match[1]) {
            try {
              const json = atob(match[1])
              const obj = JSON.parse(json)
              if (Array.isArray(obj)) decoded = { team: obj, equipment: {} } // legado
            } catch {
              console.warn('Invalid legacy code format.')
            }
          }
        }

        if (decoded && decoded.team && decoded.equipment) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Shared team detected with equipment:', decoded)
          }
          useTeamStore.setState({ team: decoded.team })
          const normalized: Record<number, { artifact: number | null; cards: number[] }> = {}
          for (const key of Object.keys(decoded.equipment || {})) {
            const heroId = Number(key)
            const eq = decoded.equipment[key] || {}
            normalized[heroId] = {
              artifact: eq.artifact ?? null,
              cards: Array.isArray(eq.cards) ? eq.cards : [],
            }
          }
          useEquipmentStore.setState({ equipment: normalized })
          setSharedTeam(decoded.team)
        } else if (decoded && Array.isArray(decoded)) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Legacy team detected:', decoded)
          }
          useTeamStore.setState({ team: decoded })
          setSharedTeam(decoded)
        } else {
          clearTeam()
        }

      } catch (err) {
        console.error('❌ Error loading Team Builder data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAll()
    // ✅ deps vazias: NÃO reexecuta ao mudar qualquer estado/ação do store
  }, [])

  // ============================================================
  // 🔹 Dynamic filtering
  // ============================================================
  useEffect(() => {
    const result = heroes.filter((h) =>
      Object.entries(filters).every(([key, value]) =>
        value ? String((h as any)[key]) === value : true
      )
    )
    setFiltered(result)
  }, [filters, heroes])

  const clearFilters = useCallback(
    () =>
      setFilters({
        camp: '',
        stance: '',
        damagetype: '',
        occupation: '',
        quality: '',
      }),
    []
  )

  // ============================================================
  // 🔹 Loading
  // ============================================================
  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center animate-fadeIn">
        <div className="loader mb-4 h-10 w-10 animate-spin rounded-full border-4 border-t-accent" />
        <p className="text-sm text-text-muted">{t(UI_KEYS.common.loading)}</p>
      </div>
    )
  }

  // ============================================================
  // 🔹 Render final
  // ============================================================
  return (
    <ListPagePanel>
      <h1 className="mb-4 text-2xl font-bold uppercase tracking-wide">
        {t(UI_KEYS.nav.teamBuilder)}
      </h1>

      {isReadOnly && (
        <p className="mb-4 text-sm text-text-muted">This is a shared team — editing is disabled.</p>
      )}

      {!isReadOnly && (
        <>
          <FilterBar filters={filters} setFilters={setFilters} clearFilters={clearFilters} />
          <div className="mb-3">
            <HeroPool heroes={filtered} />
          </div>
        </>
      )}

      <div className="flex flex-col lg:flex-row gap-4 mt-4 items-start">
        <div className="flex justify-center w-full lg:w-auto">
          <TeamGrid initialTeam={sharedTeam || undefined} readOnly={isReadOnly} />
        </div>
        <div className="flex-1">
          <TeamActiveBonds teamOverride={sharedTeam || undefined} />
        </div>
      </div>

      <div>
        <HeroEquipmentList readOnly={isReadOnly} />
      </div>

      {!isReadOnly && (
        <div className="mt-6 flex justify-center">
          <ShareButton />
        </div>
      )}
    </ListPagePanel>
  )
}
