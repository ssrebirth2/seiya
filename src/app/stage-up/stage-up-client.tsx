'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { HeroIconFilterBar, type HeroListFilters } from '@/components/heroes/HeroIconFilterBar'
import { StageUpControls } from '@/components/stage-up/StageUpControls'
import { StageUpHeroPicker, type StageUpPickerHero } from '@/components/stage-up/StageUpHeroPicker'
import { StageUpPlanView } from '@/components/stage-up/StageUpPlanView'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/v2'
import { useHeroHeadIconMap } from '@/hooks/use-hero-head-icons'
import { useStageUpCatalog, useStageUpHero, useStageUpLadders } from '@/hooks/use-stage-up'
import { applySkillValues, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import { computeStagePlan, clampStageRange, getQualityMaxStage } from '@/lib/game/compute-stage-plan'
import { fetchHeroTypeDescMap } from '@/lib/game/hero-type-desc'
import { useLanguage } from '@/context/language-context'
import { createTranslationGetter, translateKeys } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { buildShareUrl } from '@/lib/metadata/share-url'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'
import { queryKeys } from '@/lib/query/query-keys'
import { getQueryClient } from '@/lib/query/query-client'
import { supabase } from '@/lib/supabase-client'

function parseIntParam(raw: string | null): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function StageUpClientInner() {
  const { lang } = useLanguage()
  const { t, site } = useUiTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: iconMap } = useHeroHeadIconMap()
  const laddersQuery = useStageUpLadders()
  const catalogQuery = useStageUpCatalog()

  const [heroId, setHeroId] = useState<number | null>(() => parseIntParam(searchParams.get('hero')))
  const [fromStage, setFromStage] = useState<number | null>(() => parseIntParam(searchParams.get('from')))
  const [toStage, setToStage] = useState<number | null>(() => parseIntParam(searchParams.get('to')))
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
  const [namesReady, setNamesReady] = useState(false)

  const heroQuery = useStageUpHero(heroId)
  const getT = useMemo(() => createTranslationGetter(translations, { lang }), [translations, lang])

  useEffect(() => {
    setupGlobalSkillTooltips()
  }, [])

  useEffect(() => {
    const qc = getQueryClient()
    qc.fetchQuery({
      queryKey: queryKeys.heroTypeDesc,
      queryFn: fetchHeroTypeDescMap,
      staleTime: GAME_CONFIG_STALE_MS,
    }).then(setTypeMap)
  }, [])

  useEffect(() => {
    const heroes = catalogQuery.data
    if (!heroes?.length) return
    let cancelled = false
    const loadNames = async () => {
      const resourceIds = heroes.map((h) => h.id * 10)
      const map: Record<number, string> = {}
      for (let i = 0; i < resourceIds.length; i += 100) {
        const chunk = resourceIds.slice(i, i + 100)
        const { data } = await supabase.from('RoleResourcesConfig').select('id, role_name').in('id', chunk)
        if (cancelled) return
        for (const row of data ?? []) {
          if (row.role_name) map[Number(row.id)] = String(row.role_name)
        }
      }
      setRoleNameMap(map)
      setNamesReady(true)
    }
    loadNames()
    return () => {
      cancelled = true
    }
  }, [catalogQuery.data])

  useEffect(() => {
    if (!namesReady) return
    let cancelled = false
    const keys = new Set<string>()
    Object.values(roleNameMap).forEach((k) => keys.add(k))
    Object.values(typeMap).forEach((k) => keys.add(k))
    translateKeys([...keys], lang).then((map) => {
      if (!cancelled) setTranslations(map)
    })
    return () => {
      cancelled = true
    }
  }, [lang, namesReady, roleNameMap, typeMap])

  const bundle = heroQuery.data ?? null
  const ladders = laddersQuery.data ?? bundle?.ladders

  useEffect(() => {
    if (!bundle || !ladders) return
    setFromStage((prev) => prev ?? bundle.baseStage)
    setToStage((prev) => {
      if (prev != null) return prev
      const cap = getQualityMaxStage(ladders, bundle.baseQuality)
      return cap > 0 ? Math.min(bundle.maxStage, cap) : bundle.maxStage
    })
  }, [bundle, ladders])

  useEffect(() => {
    if (!bundle || fromStage == null || toStage == null) return
    const next = clampStageRange(fromStage, toStage, bundle.maxStage)
    if (next.from !== fromStage) setFromStage(next.from)
    if (next.to !== toStage) setToStage(next.to)
  }, [bundle, fromStage, toStage])

  useEffect(() => {
    if (heroId == null || fromStage == null || toStage == null) return
    const params = new URLSearchParams(searchParams.toString())
    const same =
      params.get('hero') === String(heroId) &&
      params.get('from') === String(fromStage) &&
      params.get('to') === String(toStage) &&
      !params.has('quality')
    if (same) return
    router.replace(
      buildShareUrl(`/stage-up?hero=${heroId}&from=${fromStage}&to=${toStage}`, lang),
      { scroll: false }
    )
  }, [heroId, fromStage, toStage, lang, router, searchParams])

  const pickerHeroes: StageUpPickerHero[] = useMemo(() => {
    const heroes = catalogQuery.data ?? []
    return heroes
      .filter((hero) => {
        const match = (field: keyof HeroListFilters, value: number) =>
          !filters[field] || filters[field] === String(value)
        if (!match('camp', hero.camp)) return false
        if (!match('stance', hero.stance)) return false
        if (!match('damagetype', hero.damagetype)) return false
        if (!match('occupation', hero.occupation)) return false
        if (!match('quality', hero.quality)) return false
        if (!filters.search) return true
        const name = getT(roleNameMap[hero.id * 10]).toLowerCase()
        return name.includes(filters.search.toLowerCase()) || String(hero.id).includes(filters.search)
      })
      .map((hero) => ({
        ...hero,
        name: getT(roleNameMap[hero.id * 10]),
      }))
  }, [catalogQuery.data, filters, getT, roleNameMap])

  const plan = useMemo(() => {
    if (!bundle || !ladders || fromStage == null || toStage == null) {
      return null
    }
    return computeStagePlan(bundle, ladders, {
      fromStage,
      toStage,
      currentQuality: bundle.baseQuality,
    })
  }, [bundle, ladders, fromStage, toStage])

  const selectedCatalog = catalogQuery.data?.find((h) => h.id === heroId) ?? null
  const selectedName = heroId != null ? getT(roleNameMap[heroId * 10]) : ''

  const selectHero = (id: number) => {
    setHeroId(id)
    setFromStage(null)
    setToStage(null)
  }

  const catalogLoading = catalogQuery.isLoading || laddersQuery.isLoading

  return (
    <ListPagePanel className="min-w-0 overflow-x-clip">
      <PageHeader title={t(UI_KEYS.nav.stageUp)} subtitle={site('stageUpDesc')} />

      <div className="stage-up-layout">
        <section className="stage-up-roster min-w-0 space-y-3">
          {catalogLoading ? (
            <LoadingSkeleton variant="filters" />
          ) : (
            <HeroIconFilterBar
              className="hero-icon-filter-bar--embedded"
              filters={filters}
              onChange={(field, value) => setFilters((prev) => ({ ...prev, [field]: value }))}
              typeMap={typeMap}
              getT={getT}
              resultCount={pickerHeroes.length}
            />
          )}
          {catalogLoading ? (
            <LoadingSkeleton variant="grid" count={8} />
          ) : catalogQuery.isError ? (
            <EmptyState message={t(UI_KEYS.common.noData)} />
          ) : (
            <StageUpHeroPicker
              heroes={pickerHeroes}
              selectedId={heroId}
              iconMap={iconMap}
              onSelect={selectHero}
            />
          )}
        </section>

        <div className="stage-up-main">
          {heroId == null ? (
            <EmptyState message={site('pickAHero')} />
          ) : heroQuery.isLoading || fromStage == null || toStage == null ? (
            <LoadingSkeleton variant="detail" />
          ) : heroQuery.isError || !bundle || !plan ? (
            <EmptyState message={t(UI_KEYS.common.noData)} />
          ) : (
            <>
              <StageUpControls
                bundle={bundle}
                iconMap={iconMap}
                heroName={applySkillValues(selectedName, 0, {})}
                camp={selectedCatalog?.camp ?? 0}
                stance={selectedCatalog?.stance ?? 0}
                damagetype={selectedCatalog?.damagetype ?? 0}
                occupation={selectedCatalog?.occupation ?? 0}
                typeMap={typeMap}
                getT={getT}
                fromStage={plan.fromStage}
                toStage={plan.toStage}
                onRangeChange={(from, to) => {
                  setFromStage(from)
                  setToStage(to)
                }}
              />
              <StageUpPlanView plan={plan} consumeRefMap={bundle.consumeRefMap} />
            </>
          )}
        </div>
      </div>
    </ListPagePanel>
  )
}

export default function StageUpClient() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="page" />}>
      <StageUpClientInner />
    </Suspense>
  )
}
