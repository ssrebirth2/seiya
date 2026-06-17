'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { getQueryClient } from '@/lib/query/query-client'
import { fetchHeroTypeDescMap } from '@/lib/game/hero-type-desc'
import { queryKeys } from '@/lib/query/query-keys'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'
import HeroTabsContainer from '@/components/heroes/HeroTabsContainer'
import GameImage from '@/components/ui/GameImage'
import { isAssetAvailable } from '@/lib/assets/asset-registry'
import {
  superSkillBannerPath,
  superSkillBannerUrl,
  IMAGE_UNAVAILABLE,
} from '@/lib/assets/game-images'
import {
  fetchHeroHeadIconEntry,
  fetchHeroHeadIconMap,
  getHeroSquareHeadUrl,
  type HeroHeadIconEntry,
} from '@/lib/game/fetch-hero-head-icons'
import { useHeroHeadIconMap } from '@/hooks/use-hero-head-icons'
import { LoadingSkeleton, QualityBadge, StatGrid, DetailPageShell } from '@/components/ui/v2'
import { SetPageMeta } from '@/lib/ui/usePageMeta'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { qualityNameKey } from '@/lib/i18n/ui-keys'
import { applySkillValues, formatDisplayText, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import { isHeroListed } from '@/lib/game/hidden-hero-ids'

const SPECIAL_FIELDS = ['camp', 'stance', 'damagetype', 'occupation'] as const

const FIELD_LABEL_KEYS: Record<string, string | null> = {
  rolename_short: null,
  role_constellation_name: UI_KEYS.hero.constellation,
  role_labels: null,
  quality: null,
  occupation: UI_KEYS.filter.class,
  stance: UI_KEYS.filter.position,
  damagetype: null,
  camp: UI_KEYS.filter.faction,
}

const FIELDS_TO_SHOW = [
  'rolename_short',
  'role_constellation_name',
  'role_labels',
  'quality',
  'occupation',
  'stance',
  'damagetype',
  'camp',
] as const

export default function HeroDetailClient() {
  const { id } = useParams()
  const heroId = parseInt(id as string)
  const { lang } = useLanguage()
  const { t, site, noData } = useUiTranslation()
  const { data: iconMap } = useHeroHeadIconMap()
  const [heroHeadEntry, setHeroHeadEntry] = useState<HeroHeadIconEntry | null>(null)

  const [hero, setHero] = useState<any>(null)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [typeMap, setTypeMap] = useState<Record<string, string>>({})
  const [labelMap, setLabelMap] = useState<Record<number, string>>({})
  const [roleName, setRoleName] = useState<string>('')
  const [skillIds, setSkillIds] = useState<(number | string)[]>([])
  const [isHeroLoaded, setIsHeroLoaded] = useState(false)
  const [isRetranslating, setIsRetranslating] = useState(false)

  const lcKeysRef = useRef<string[]>([])
  const labelRecordsRef = useRef<{ id: number; name: string }[]>([])

  const getT = useMemo(() => createTranslationGetter(translations, { lang }), [translations, lang])

  useEffect(() => setupGlobalSkillTooltips(), [])

  useEffect(() => {
    let cancelled = false

    const loadHeroData = async () => {
      setIsHeroLoaded(false)

      if (!isHeroListed(heroId)) {
        setIsHeroLoaded(true)
        return
      }

      try {
        const resourceId = heroId * 10
        const qc = getQueryClient()

        const [{ data: heroData }, { data: resource }, tMap, headEntry] = await Promise.all([
          supabase.from('RoleConfig').select('*').eq('id', heroId).single(),
          supabase.from('RoleResourcesConfig').select('role_name').eq('id', resourceId).single(),
          qc.fetchQuery({
            queryKey: queryKeys.heroTypeDesc,
            queryFn: fetchHeroTypeDescMap,
            staleTime: GAME_CONFIG_STALE_MS,
          }),
          fetchHeroHeadIconEntry(heroId),
          qc.prefetchQuery({
            queryKey: queryKeys.heroHeadIcons,
            queryFn: fetchHeroHeadIconMap,
            staleTime: GAME_CONFIG_STALE_MS,
          }),
        ])

        if (cancelled || !heroData) return

        setHeroHeadEntry(headEntry)

        const translationKeys = new Set<string>()
        if (resource?.role_name) translationKeys.add(resource.role_name)
        Object.values(tMap).forEach((desc) => translationKeys.add(desc))
        setTypeMap(tMap)

        let labelRecords: { id: number; name: string }[] = []
        const labelIds: number[] = (() => {
          try {
            const val = heroData.role_labels
            if (!val) return []
            if (typeof val === 'string') return JSON.parse(val)
            if (Array.isArray(val)) return val
            return []
          } catch {
            return []
          }
        })()

        if (labelIds.length > 0) {
          const { data: labels } = await supabase
            .from('SkillLabelConfig')
            .select('id, name')
            .in('id', labelIds)
          labelRecords = labels ?? []
          labelRecords.forEach((l) => translationKeys.add(l.name))
        }

        Object.entries(heroData).forEach(([_, value]) => {
          if (typeof value === 'string' && value.startsWith('LC_')) translationKeys.add(value)
        })
        SPECIAL_FIELDS.forEach((key) => {
          const mapKey = `${key}_${heroData[key]}`
          if (tMap[mapKey]) translationKeys.add(tMap[mapKey])
        })

        if (heroData.quality) translationKeys.add(qualityNameKey(heroData.quality))

        lcKeysRef.current = Array.from(translationKeys)
        labelRecordsRef.current = labelRecords
        setRoleName(resource?.role_name || '')

        try {
          const parsed =
            typeof heroData.skills === 'string' ? JSON.parse(heroData.skills) : heroData.skills
          if (Array.isArray(parsed)) {
            const ids = parsed.map((s: any) => (typeof s === 'string' ? s : Number(s)))
            setSkillIds(ids)
          } else {
            setSkillIds([])
          }
        } catch {
          setSkillIds([])
        }

        setHero(heroData)
        setIsHeroLoaded(true)
      } catch (err) {
        console.error('Erro ao carregar dados do herói:', err)
        if (!cancelled) setIsHeroLoaded(true)
      }
    }

    loadHeroData()
    return () => {
      cancelled = true
    }
  }, [heroId])

  useEffect(() => {
    if (!isHeroLoaded || !lcKeysRef.current.length) return

    let cancelled = false
    setIsRetranslating(true)

    const retranslate = async () => {
      const translated = await translateKeys(lcKeysRef.current, lang)
      if (cancelled) return

      const lblMap: Record<number, string> = {}
      labelRecordsRef.current.forEach((l) => (lblMap[l.id] = translated[l.name] || l.name))

      setTranslations(translated)
      setLabelMap(lblMap)
      setIsRetranslating(false)
    }

    retranslate()
    return () => {
      cancelled = true
    }
  }, [lang, isHeroLoaded])

  const translateField = (key: string, value: any) => {
    if (key === 'quality') return getT(qualityNameKey(Number(value)))
    if (key === 'role_labels') {
      const ids = Array.isArray(value) ? value : []
      return ids.map((id) => labelMap[id]).filter(Boolean).join(', ')
    }
    if (SPECIAL_FIELDS.includes(key as (typeof SPECIAL_FIELDS)[number])) {
      return getT(typeMap[`${key}_${value}`])
    }
    return getT(String(value))
  }

  const fieldLabel = (key: string) => {
    const lcKey = FIELD_LABEL_KEYS[key]
    if (lcKey) return t(lcKey)
    if (key === 'rolename_short') return site('shortName')
    if (key === 'role_labels') return site('tags')
    if (key === 'quality') return t(UI_KEYS.common.quality)
    if (key === 'damagetype') return t(UI_KEYS.filter.damageType)
    return key
  }

  const headIconUrl = useMemo(() => {
    const map =
      heroHeadEntry != null ? { [heroId]: heroHeadEntry } : iconMap
    return getHeroSquareHeadUrl(map, heroId)
  }, [heroHeadEntry, iconMap, heroId])
  const hasHeadIcon = headIconUrl !== IMAGE_UNAVAILABLE
  const bannerPath = useMemo(() => superSkillBannerPath(heroId), [heroId])
  const bannerUrl = useMemo(() => superSkillBannerUrl(heroId), [heroId])
  const hasBannerArt = useMemo(() => isAssetAvailable(bannerPath), [bannerPath])

  const heroNameHtml = useMemo(
    () => applySkillValues(getT(roleName), 0, {}),
    [roleName, translations]
  )

  const statEntries = useMemo(() => {
    if (!hero) return []
    return FIELDS_TO_SHOW.map((key) => {
      const val = hero[key]
      if (val === undefined || val === null || val === '') return null
      return {
        key,
        label: fieldLabel(key),
        value: translateField(key, val),
      }
    }).filter(Boolean) as { key: string; label: string; value: string }[]
  }, [hero, translations, labelMap, typeMap, t, site, getT])

  if (!isHeroLoaded) {
    return <LoadingSkeleton variant="detail" />
  }

  if (!hero) {
    return (
      <div className="panel py-12 text-center">
        <p className="mb-4 text-text-muted">{site('heroNotFound')}</p>
        <Link href="/heroes" className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          {t(UI_KEYS.common.loginBack)}
        </Link>
      </div>
    )
  }

  const qualityLabel =
    hero.quality != null ? getT(qualityNameKey(hero.quality)) : null

  return (
    <>
      <SetPageMeta title={getT(roleName)} />
      <div className={isRetranslating ? 'i18n-content--pending' : undefined}>
      <DetailPageShell
        backHref="/heroes"
        backLabel={t(UI_KEYS.common.loginBack)}
        title={getT(roleName)}
        header={
          <section className="profile-header -mx-2 sm:mx-0">
            {hasBannerArt && (
              <>
                <div
                  className="pointer-events-none absolute -right-6 top-1/2 z-0 h-40 w-40 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl sm:h-56 sm:w-56"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[min(72%,17.5rem)] sm:w-[min(58%,22rem)] md:w-[min(50%,26rem)]"
                  aria-hidden
                >
                  <GameImage
                    src={bannerUrl}
                    rawSrc={bannerPath}
                    alt=""
                    aria-hidden
                    className="profile-header-art absolute bottom-0 right-0 h-[118%] w-auto max-w-[135%] object-contain object-right-bottom"
                  />
                </div>
                <div
                  className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-panel from-35% via-panel/85 to-transparent"
                  aria-hidden
                />
              </>
            )}

            <div className="relative z-10 px-4 py-5 sm:px-8 sm:py-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
                {hasHeadIcon && (
                  <GameImage
                    src={headIconUrl}
                    alt={getT(roleName)}
                    className="hero-profile-head h-28 w-28 sm:h-32 sm:w-32"
                  />
                )}

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {qualityLabel && hero.quality != null ? (
                      <QualityBadge quality={hero.quality} className="text-sm" />
                    ) : null}
                    <span className="text-xs text-text-muted">ID {hero.id}</span>
                  </div>
                  <h1
                    className="font-display text-3xl font-bold leading-tight sm:text-4xl"
                    dangerouslySetInnerHTML={{ __html: heroNameHtml }}
                  />
                </div>
              </div>
            </div>
          </section>
        }
        stats={
          statEntries.length > 0 ? (
            <StatGrid
              title={t(UI_KEYS.common.baseAttribute)}
              entries={statEntries.map((e) => ({
                ...e,
                html: true,
                value: formatDisplayText(e.value, 0, {}),
              }))}
            />
          ) : null
        }
      >
        {(hero.role_introduction || hero.role_features) && (
          <section className="panel space-y-3">
            {hero.role_introduction && (
              <p
                className="text-sm leading-relaxed text-text-muted"
                dangerouslySetInnerHTML={{
                  __html: applySkillValues(getT(hero.role_introduction), 0, {}),
                }}
              />
            )}
            {hero.role_features && (
              <p
                className="text-sm leading-relaxed text-text-muted"
                dangerouslySetInnerHTML={{
                  __html: applySkillValues(getT(hero.role_features), 0, {}),
                }}
              />
            )}
          </section>
        )}

        {skillIds.length > 0 ? (
          <HeroTabsContainer heroId={heroId} skillIds={skillIds} />
        ) : (
          <section className="panel text-center text-sm text-text-muted">{site('noSkills')}</section>
        )}
      </DetailPageShell>
      </div>
    </>
  )
}
