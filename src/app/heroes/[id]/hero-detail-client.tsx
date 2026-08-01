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
import {
  getAttackTypeIconPath,
  getCampIconPath,
  getOccupationIconPath,
  getPositionIconPath,
  getQualityIconClassName,
  getQualityIconPath,
} from '@/lib/game/hero-ui-sprites'
import { LoadingSkeleton, DetailPageShell } from '@/components/ui/v2'
import { SetPageMeta } from '@/lib/ui/usePageMeta'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { qualityNameKey } from '@/lib/i18n/ui-keys'
import {
  applySkillValues,
  formatPlainLabel,
  setupGlobalSkillTooltips,
} from '@/lib/game/apply-skill-values'
import { isHeroListed } from '@/lib/game/hidden-hero-ids'

const SPECIAL_FIELDS = ['camp', 'stance', 'damagetype', 'occupation'] as const

type MetaIcon = {
  key: string
  src: string
  label: string
}

function parseLabelIds(raw: unknown): number[] {
  try {
    if (!raw) return []
    if (typeof raw === 'string') return JSON.parse(raw)
    if (Array.isArray(raw)) return raw.map(Number)
    return []
  } catch {
    return []
  }
}

export default function HeroDetailClient() {
  const { id } = useParams()
  const heroId = parseInt(id as string)
  const { lang } = useLanguage()
  const { t, site } = useUiTranslation()
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
        const labelIds = parseLabelIds(heroData.role_labels)

        if (labelIds.length > 0) {
          const { data: labels } = await supabase
            .from('SkillLabelConfig')
            .select('id, name')
            .in('id', labelIds)
          labelRecords = labels ?? []
          labelRecords.forEach((l) => translationKeys.add(l.name))
        }

        if (heroData.role_introduction) translationKeys.add(String(heroData.role_introduction))
        if (heroData.role_features) translationKeys.add(String(heroData.role_features))

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

  const headIconUrl = useMemo(() => {
    const map = heroHeadEntry != null ? { [heroId]: heroHeadEntry } : iconMap
    return getHeroSquareHeadUrl(map, heroId)
  }, [heroHeadEntry, iconMap, heroId])
  const hasHeadIcon = headIconUrl !== IMAGE_UNAVAILABLE
  const bannerPath = useMemo(() => superSkillBannerPath(heroId), [heroId])
  const bannerUrl = useMemo(() => superSkillBannerUrl(heroId), [heroId])
  const hasBannerArt = useMemo(() => isAssetAvailable(bannerPath), [bannerPath])

  const heroNameHtml = useMemo(
    () => applySkillValues(getT(roleName), 0, {}),
    [roleName, translations, getT]
  )

  const typeLabel = (field: (typeof SPECIAL_FIELDS)[number], value: number) => {
    const key = typeMap[`${field}_${value}`]
    return key ? formatPlainLabel(getT(key)) : ''
  }

  const metaIcons = useMemo((): MetaIcon[] => {
    if (!hero) return []
    const camp = Number(hero.camp)
    const stance = Number(hero.stance)
    const damagetype = Number(hero.damagetype)
    const occupation = Number(hero.occupation)

    const items: MetaIcon[] = [
      {
        key: 'occupation',
        src: getOccupationIconPath(occupation),
        label: typeLabel('occupation', occupation),
      },
      {
        key: 'camp',
        src: getCampIconPath(camp),
        label: typeLabel('camp', camp),
      },
      {
        key: 'stance',
        src: getPositionIconPath(stance, lang),
        label: typeLabel('stance', stance),
      },
      {
        key: 'damagetype',
        src: getAttackTypeIconPath(damagetype),
        label: typeLabel('damagetype', damagetype),
      },
    ]

    return items.filter((item) => item.src && item.label)
  }, [hero, typeMap, translations, lang, getT])

  const tagChips = useMemo(() => {
    if (!hero) return []
    const ids = parseLabelIds(hero.role_labels)
    return ids
      .map((id) => {
        const raw = labelMap[id]
        if (!raw) return null
        const label = formatPlainLabel(raw)
        return label || null
      })
      .filter((label): label is string => Boolean(label))
  }, [hero, labelMap])

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
    hero.quality != null ? formatPlainLabel(getT(qualityNameKey(hero.quality))) : null
  const qualityIconSrc =
    hero.quality != null ? getQualityIconPath(Number(hero.quality), Number(hero.quality)) : ''
  const qualityIconClass =
    hero.quality != null
      ? getQualityIconClassName(Number(hero.quality), Number(hero.quality))
      : ''

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

              <div className="relative z-10 px-4 py-4 sm:px-7 sm:py-5">
                <div className="hero-profile-header__row">
                  {hasHeadIcon && (
                    <GameImage
                      src={headIconUrl}
                      alt={getT(roleName)}
                      className="hero-profile-head"
                    />
                  )}

                  <div className="hero-profile-header__body">
                    <div className="hero-profile-header__topline">
                      {qualityIconSrc ? (
                        <GameImage
                          src={qualityIconSrc}
                          alt={qualityLabel || t(UI_KEYS.common.quality)}
                          title={qualityLabel || undefined}
                          className={`hero-profile-quality ${qualityIconClass}`.trim()}
                        />
                      ) : null}
                      <span className="hero-profile-header__id">ID {hero.id}</span>
                    </div>
                    <h1
                      className="hero-profile-header__name font-display"
                      dangerouslySetInnerHTML={{ __html: heroNameHtml }}
                    />

                    {metaIcons.length > 0 ? (
                      <ul className="hero-profile-meta" aria-label={t(UI_KEYS.common.detail)}>
                        {metaIcons.map((icon) => (
                          <li key={icon.key}>
                            <GameImage
                              src={icon.src}
                              alt={icon.label}
                              title={icon.label}
                              className="hero-profile-meta__icon"
                            />
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {tagChips.length > 0 ? (
                      <ul className="hero-profile-tags">
                        {tagChips.map((tag) => (
                          <li key={tag} className="hero-profile-tag">
                            {tag}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          }
        >
          <HeroTabsContainer
            heroId={heroId}
            skillIds={skillIds}
            roleIntroduction={hero.role_introduction}
            roleFeatures={hero.role_features}
            getT={getT}
          />
        </DetailPageShell>
      </div>
    </>
  )
}
