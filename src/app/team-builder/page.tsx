'use client'

import { useEffect, useState, useMemo } from 'react'
import { Users, Swords } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import TeamGrid from '@/components/team-builder/TeamGrid'
import HeroPool from '@/components/team-builder/HeroPool'
import { HeroIconFilterBar, type HeroListFilters } from '@/components/heroes/HeroIconFilterBar'
import TeamActiveBonds from '@/components/team-builder/TeamActiveBonds'
import ShareButton from '@/components/team-builder/ShareButton'
import { decodeTeam } from '@/lib/team-builder/team-share-codec'
import { useTeamStore } from '@/lib/team-builder/stores/use-team-store'
import { useEquipmentStore } from '@/lib/team-builder/stores/use-equipment-store'
import HeroEquipmentList from '@/components/team-builder/HeroEquipmentList'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import { LoadingSkeleton, PageHeader } from '@/components/ui/v2'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { isHeroListed } from '@/lib/game/hidden-hero-ids'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { getQueryClient } from '@/lib/query/query-client'
import { fetchHeroTypeDescMap } from '@/lib/game/hero-type-desc'
import { queryKeys } from '@/lib/query/query-keys'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'

type HeroRow = {
  id: number
  stance: number
  camp: number
  occupation: number
  damagetype: number
  quality: number
}

export default function TeamBuilderPage() {
  const { lang } = useLanguage()
  const { t, site } = useUiTranslation()
  const [heroes, setHeroes] = useState<HeroRow[]>([])
  const [filters, setFilters] = useState<HeroListFilters>({
    camp: '',
    stance: '',
    damagetype: '',
    occupation: '',
    quality: '',
    search: '',
  })
  const [typeMap, setTypeMap] = useState<Record<string, string>>({})
  const [roleNameMap, setRoleNameMap] = useState<Record<number, string>>({})
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [catalogReady, setCatalogReady] = useState(false)

  const { clearTeam } = useTeamStore()
  const [sharedTeam, setSharedTeam] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)

  const isReadOnly = !!sharedTeam
  const getT = useMemo(() => createTranslationGetter(translations, { lang }), [translations, lang])

  useEffect(() => {
    let cancelled = false

    const loadCatalog = async () => {
      setLoading(true)
      const translationKeys = new Set<string>()
      const qc = getQueryClient()

      try {
        const [{ data: heroData }, tMap] = await Promise.all([
          supabase
            .from('RoleConfig')
            .select('id, stance, camp, occupation, damagetype, quality')
            .lte('id', 1499)
            .order('id', { ascending: true }),
          qc.fetchQuery({
            queryKey: queryKeys.heroTypeDesc,
            queryFn: fetchHeroTypeDescMap,
            staleTime: GAME_CONFIG_STALE_MS,
          }),
        ])

        if (cancelled || !heroData) return

        const rows = (heroData as HeroRow[]).filter((h) => isHeroListed(h.id))
        setHeroes(rows)

        const resourceIds = rows.map((h) => h.id * 10)
        const { data: resources } = await supabase
          .from('RoleResourcesConfig')
          .select('id, role_name')
          .in('id', resourceIds)

        if (cancelled) return

        const rMap: Record<number, string> = {}
        resources?.forEach((r) => {
          if (r.role_name) {
            rMap[r.id] = r.role_name
            translationKeys.add(r.role_name)
          }
        })
        setRoleNameMap(rMap)
        Object.values(tMap).forEach((desc) => translationKeys.add(desc))
        setTypeMap(tMap)
        setCatalogReady(true)

        let decoded: any | null = null
        const hash = window.location.hash?.replace(/^#/, '')
        if (hash) decoded = decodeTeam(hash)

        if (!decoded) {
          const match = window.location.pathname.match(/team-builder\/([^/]+)/)
          if (match && match[1]) {
            try {
              const json = atob(match[1])
              const obj = JSON.parse(json)
              if (Array.isArray(obj)) decoded = { team: obj, equipment: {} }
            } catch {
              console.warn('Invalid legacy code format.')
            }
          }
        }

        if (decoded && decoded.team && decoded.equipment) {
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
          useTeamStore.setState({ team: decoded })
          setSharedTeam(decoded)
        } else {
          clearTeam()
        }
      } catch (err) {
        console.error('❌ Error loading Team Builder data:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCatalog()
    return () => {
      cancelled = true
    }
  }, [clearTeam])

  useEffect(() => {
    if (!catalogReady) return
    let cancelled = false

    const retranslate = async () => {
      const translationKeys = new Set<string>()
      Object.values(roleNameMap).forEach((k) => translationKeys.add(k))
      Object.values(typeMap).forEach((k) => translationKeys.add(k))
      const translationMap = await translateKeys(Array.from(translationKeys), lang)
      if (!cancelled) setTranslations(translationMap)
    }

    retranslate()
    return () => {
      cancelled = true
    }
  }, [lang, catalogReady, roleNameMap, typeMap])

  const filtered = useMemo(() => {
    return heroes.filter((hero) => {
      const match = (field: keyof HeroListFilters, value: number) =>
        !filters[field] || filters[field] === String(value)

      const matchesFilters =
        match('camp', hero.camp) &&
        match('stance', hero.stance) &&
        match('damagetype', hero.damagetype) &&
        match('occupation', hero.occupation) &&
        match('quality', hero.quality)

      if (!matchesFilters) return false

      const name = getT(roleNameMap[hero.id * 10]).toLowerCase()
      const search = filters.search.toLowerCase()
      return name.includes(search)
    })
  }, [heroes, filters, roleNameMap, getT])

  const handleFilterChange = (field: keyof HeroListFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <ListPagePanel className="min-w-0 overflow-x-clip">
        <LoadingSkeleton variant="filters" />
        <LoadingSkeleton variant="detail" />
      </ListPagePanel>
    )
  }

  return (
    <ListPagePanel className="min-w-0 overflow-x-clip">
      <PageHeader title={t(UI_KEYS.nav.teamBuilder)} />

      {isReadOnly && (
        <p className="mb-4 rounded-lg border border-accent-border bg-accent-subtle px-4 py-2 text-sm text-foreground">
          {site('sharedTeamReadOnly')}
        </p>
      )}

      <div className="team-builder-layout min-w-0">
        {!isReadOnly && (
          <section className="team-builder-roster min-w-0 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground lg:hidden">
              <Users size={18} className="text-icon-hero" />
              Hero Pool
            </div>
            <HeroIconFilterBar
              variant="toolbar"
              filters={filters}
              onChange={handleFilterChange}
              typeMap={typeMap}
              getT={getT}
              resultCount={filtered.length}
            />
            <HeroPool heroes={filtered} />
          </section>
        )}

        <section className="team-builder-main min-w-0">
          <div className="team-builder-formation-col min-w-0 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground lg:hidden">
              <Swords size={18} className="text-accent-gold" />
              Formation
            </div>
            <h2 className="team-builder-section-title hidden lg:block">Formation</h2>
            <div className="team-builder-formation-panel min-w-0">
              <TeamGrid initialTeam={sharedTeam || undefined} readOnly={isReadOnly} />
            </div>
          </div>

          <div className="team-builder-bonds-col min-w-0">
            <TeamActiveBonds teamOverride={sharedTeam || undefined} />
          </div>
        </section>

        <section className="team-builder-equip min-w-0">
          <HeroEquipmentList readOnly={isReadOnly} />
        </section>
      </div>

      {!isReadOnly && (
        <div className="mt-8 flex justify-center border-t border-panel-border pt-6">
          <ShareButton />
        </div>
      )}
    </ListPagePanel>
  )
}
