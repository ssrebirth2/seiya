'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys } from '@/lib/i18n/language-package'
import { applySkillValues, formatDisplayText, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
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
  squareHeroHeadUrl,
} from '@/lib/assets/game-images'

const SPECIAL_FIELDS = ['camp', 'stance', 'damagetype', 'occupation'] as const
const QUALITY_MAP: Record<number, string> = { 2: 'R', 3: 'SR', 4: 'SSR', 5: 'UR' }

const FIELD_LABELS: Record<string, string> = {
  rolename_short: 'Short Name',
  role_constellation_name: 'Constellation',
  role_labels: 'Tags',
  quality: 'Quality',
  occupation: 'Class',
  stance: 'Position',
  damagetype: 'Damage Type',
  camp: 'Faction',
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

export default function HeroProfilePage() {
  const { id } = useParams()
  const heroId = parseInt(id as string)
  const { lang } = useLanguage()

  const [hero, setHero] = useState<any>(null)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [typeMap, setTypeMap] = useState<Record<string, string>>({})
  const [labelMap, setLabelMap] = useState<Record<number, string>>({})
  const [roleName, setRoleName] = useState<string>('')
  const [skillIds, setSkillIds] = useState<(number | string)[]>([])
  const [isReady, setIsReady] = useState(false)

  const getT = (key?: string) => translations[key || ''] || key || ''

  useEffect(() => setupGlobalSkillTooltips(), [])

  useEffect(() => {
    const loadHeroData = async () => {
      try {
        const resourceId = heroId * 10
        const qc = getQueryClient()

        const [{ data: heroData }, { data: resource }, tMap] = await Promise.all([
          supabase.from('RoleConfig').select('*').eq('id', heroId).single(),
          supabase.from('RoleResourcesConfig').select('role_name').eq('id', resourceId).single(),
          qc.fetchQuery({
            queryKey: queryKeys.heroTypeDesc,
            queryFn: fetchHeroTypeDescMap,
            staleTime: GAME_CONFIG_STALE_MS,
          }),
        ])

        if (!heroData) return

        const translationKeys = new Set<string>()
        if (resource?.role_name) translationKeys.add(resource.role_name)
        Object.values(tMap).forEach((desc) => translationKeys.add(desc))
        setTypeMap(tMap)

        let labelRecords: any[] = []
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

        const translated = await translateKeys(Array.from(translationKeys), lang)

        const lblMap: Record<number, string> = {}
        labelRecords.forEach((l) => (lblMap[l.id] = translated[l.name] || l.name))
        setLabelMap(lblMap)
        setTranslations(translated)
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
      } catch (err) {
        console.error('Erro ao carregar dados do herói:', err)
      } finally {
        setIsReady(true)
      }
    }

    loadHeroData()
  }, [heroId, lang])

  const translateField = (key: string, value: any) => {
    if (key === 'quality') return QUALITY_MAP[value] || value
    if (key === 'role_labels') {
      const ids = Array.isArray(value) ? value : []
      return ids.map((id) => labelMap[id]).filter(Boolean).join(', ')
    }
    if (SPECIAL_FIELDS.includes(key as (typeof SPECIAL_FIELDS)[number])) {
      return getT(typeMap[`${key}_${value}`])
    }
    return getT(String(value))
  }

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
        label: FIELD_LABELS[key] || key,
        value: translateField(key, val),
      }
    }).filter(Boolean) as { key: string; label: string; value: string }[]
  }, [hero, translations, labelMap, typeMap])

  if (!isReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner h-10 w-10" />
          <p className="text-sm text-text-muted">Loading hero profile...</p>
        </div>
      </div>
    )
  }

  if (!hero) {
    return (
      <div className="panel py-12 text-center">
        <p className="mb-4 text-text-muted">Hero not found.</p>
        <Link href="/heroes" className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to Heroes
        </Link>
      </div>
    )
  }

  const qualityLabel = hero.quality != null ? QUALITY_MAP[hero.quality] || String(hero.quality) : null

  return (
    <div className="page-stack -mx-2 sm:mx-0">
      <section className="profile-header">
        {hasBannerArt && (
          <>
            <div
              className="pointer-events-none absolute -right-6 top-1/2 z-0 h-40 w-40 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl sm:h-56 sm:w-56"
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
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-panel from-45% via-panel/90 to-transparent sm:from-40% sm:via-panel/75"
              aria-hidden
            />
          </>
        )}

        <div className="relative z-10 px-4 py-4 sm:px-6 sm:py-5">
          <Link
            href="/heroes"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-text-muted transition hover:text-foreground sm:text-sm"
          >
            <ArrowLeft size={14} className="shrink-0" />
            Back to Heroes
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
            <GameImage
              src={squareHeroHeadUrl(heroId)}
              alt={getT(roleName)}
              className="h-24 w-24 shrink-0 rounded-xl border-2 border-panel-border bg-panel-solid object-cover shadow-lg ring-1 ring-panel-border/50 sm:h-28 sm:w-28"
            />

            <div className="min-w-0 flex-1 space-y-2 pr-0 sm:max-w-[58%] md:max-w-[52%]">
              <div className="flex flex-wrap items-center gap-2">
                {qualityLabel && <span className="badge-accent">{qualityLabel}</span>}
                <span className="text-xs text-text-muted">ID {hero.id}</span>
              </div>
              <h1
                className="text-2xl font-bold leading-tight sm:text-3xl"
                dangerouslySetInnerHTML={{ __html: heroNameHtml }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Lore */}
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

      {/* Stats */}
      {statEntries.length > 0 && (
        <section className="panel">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Attributes
          </h2>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {statEntries.map(({ key, label, value }) => (
              <div
                key={key}
                className="rounded-lg border border-panel-border bg-panel-hover/50 px-3 py-2.5"
              >
                <dt className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                  {label}
                </dt>
                <dd
                  className="text-sm font-semibold leading-snug break-words text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: formatDisplayText(value, 0, {}),
                  }}
                />
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Skills tabs */}
      {skillIds.length > 0 ? (
        <section className="panel !p-0 sm:!p-0 overflow-hidden">
          <HeroTabsContainer heroId={heroId} skillIds={skillIds} />
        </section>
      ) : (
        <section className="panel text-center text-sm text-text-muted">
          No skills available for this hero.
        </section>
      )}
    </div>
  )
}
