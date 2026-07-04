'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { forceCardQualityNameKey } from '@/lib/i18n/ui-keys'
import { useLanguage } from '@/context/language-context'
import { useLocalizedHref } from '@/lib/i18n/localized-href'
import { isForceCardListed } from '@/lib/game/hidden-force-card-ids'
import {
  buildForceCardRestrictionChips,
  collectRestrictionTranslationKeys,
} from '@/lib/game/force-card-equip'
import { applySkillValues } from '@/lib/game/apply-skill-values'
import {
  normalizeConsumeList,
  normalizeDesValueList,
  normalizeSkillRefList,
  parseGameData,
} from '@/lib/game/parse-game-data'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { preloadConsumeRefMap } from '@/hooks/use-consume-ref-map'
import ForceCardTabsContainer from '@/components/force-cards/ForceCardTabsContainer'
import ForceCardOverview from '@/components/force-cards/ForceCardOverview'
import { ForceCardDetailHeader } from '@/components/force-cards/ForceCardDetailHeader'
import { LoadingSkeleton, DetailPageShell } from '@/components/ui/v2'
import { SetPageMeta } from '@/lib/ui/usePageMeta'

type SkillConfig = {
  skillid: number | string
  name?: string
  skill_des?: unknown
  skill_sketch?: unknown
}

function parseAttributeKeys(input: unknown): string[] {
  const keys: string[] = []
  for (const row of parseGameData(input)) {
    if (Array.isArray(row) && typeof row[0] === 'string' && row[0].startsWith('LC_')) {
      keys.push(row[0])
    }
  }
  return keys
}

function parseStarIdList(input: unknown): number[] {
  try {
    const parsed = typeof input === 'string' ? JSON.parse(input) : input
    return Array.isArray(parsed) ? parsed.map(Number).filter((n) => !Number.isNaN(n)) : []
  } catch {
    return []
  }
}

function collectSkillTranslationKeys(skills: SkillConfig[]): string[] {
  const keys = new Set<string>()
  for (const skill of skills) {
    if (skill.name?.startsWith?.('LC_')) keys.add(skill.name)
    normalizeDesValueList(skill.skill_des).forEach((entry) => entry.des && keys.add(entry.des))
    normalizeDesValueList(skill.skill_sketch).forEach((entry) => entry.des && keys.add(entry.des))
  }
  return Array.from(keys)
}

function collectSkillIdsFromRows(rows: unknown[]): string[] {
  const ids = new Set<string>()
  for (const row of rows) {
    const ref = normalizeSkillRefList((row as { skill_up?: unknown })?.skill_up)[0]?.skill_id
    if (ref != null) ids.add(String(ref))
  }
  return Array.from(ids)
}

function collectForceCardConsumeEntries(rows: unknown[]): ConsumeEntry[] {
  const entries: ConsumeEntry[] = []
  for (const row of rows) {
    const record = row as { consume?: unknown; decompose_return?: unknown }
    entries.push(...normalizeConsumeList(record.consume))
    entries.push(...normalizeConsumeList(record.decompose_return))
  }
  return entries
}

export default function ForceCardDetailClient() {
  const { id } = useParams()
  const cardId = Number(id)
  const { lang } = useLanguage()
  const localized = useLocalizedHref()
  const { t, site, isReady: isUiReady } = useUiTranslation()

  const [item, setItem] = useState<any>(null)
  const [info, setInfo] = useState<any>(null)
  const [levels, setLevels] = useState<any[]>([])
  const [starUps, setStarUps] = useState<any[]>([])
  const [awakens, setAwakens] = useState<any[]>([])
  const [reborns, setReborns] = useState<any[]>([])
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [consumeRefMap, setConsumeRefMap] = useState<ConsumeRefMap>({})
  const [isReady, setIsReady] = useState(false)

  const getT = useCallback(
    (key?: string) => createTranslationGetter(translations, { lang })(key),
    [translations, lang]
  )

  const parseIds = useCallback((input: any): any[] => {
    if (Array.isArray(input)) return input
    if (typeof input === 'string' && input.trim()) {
      try {
        const parsed = JSON.parse(input)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }, [])

  useEffect(() => {
    if (!cardId) return

    if (!isForceCardListed(cardId)) {
      setItem(null)
      setIsReady(true)
      return
    }

    let cancelled = false

    const loadForceCardData = async () => {
      setIsReady(false)
      try {
        const [{ data: itemRow }, { data: infoRow }, { data: lvRows }] = await Promise.all([
          supabase.from('ForceCardItemConfig').select('*').eq('id', cardId).maybeSingle(),
          supabase.from('ForceCardInfoConfig').select('*').eq('id', cardId).maybeSingle(),
          supabase.from('ForceCardLevelConfig').select('*').order('id', { ascending: true }),
        ])

        if (cancelled) return

        if (!itemRow) {
          setItem(null)
          setInfo(null)
          setLevels([])
          setStarUps([])
          setAwakens([])
          setReborns([])
          setTranslations({})
          return
        }

        const [starIds, awakenIds, rebornIds] = [
          parseIds(infoRow?.card_star),
          parseIds(infoRow?.card_awaken),
          parseIds(infoRow?.reborn_id),
        ]

        const [suRes, akRes, rbRes] = await Promise.all([
          starIds.length
            ? supabase.from('ForceCardStarUpConfig').select('*').in('id', starIds)
            : { data: [] },
          awakenIds.length
            ? supabase.from('ForceCardAwakenUpConfig').select('*').in('id', awakenIds)
            : { data: [] },
          rebornIds.length
            ? supabase.from('ForceCardRebornConfig').select('*').in('id', rebornIds)
            : { data: [] },
        ])

        if (cancelled) return

        const nextStarUps = (suRes.data || []).sort((a, b) => a.id - b.id)
        const nextAwakens = (akRes.data || []).sort((a, b) => a.id - b.id)
        const nextReborns = (rbRes.data || []).sort((a, b) => a.id - b.id)

        const skillIds = new Set<string>([
          ...collectSkillIdsFromRows(nextStarUps),
          ...collectSkillIdsFromRows(nextAwakens),
          ...collectSkillIdsFromRows(nextReborns),
        ])
        const overviewSkillId = normalizeSkillRefList(infoRow?.card_star)[0]?.skill_id
        if (overviewSkillId != null) skillIds.add(String(overviewSkillId))

        const starIdList = parseStarIdList(infoRow?.attribute_develop)
        const [{ data: skills }, { data: developRows }] = await Promise.all([
          skillIds.size
            ? supabase.from('SkillConfig').select('*').in('skillid', Array.from(skillIds))
            : Promise.resolve({ data: [] as SkillConfig[] }),
          starIdList.length
            ? supabase
                .from('ForceCardAttributeDevelopConfig')
                .select('id, attribute')
                .in('id', starIdList)
            : Promise.resolve({ data: [] as { id: number; attribute: unknown }[] }),
        ])

        if (cancelled) return

        const keys = new Set<string>()
        if (itemRow?.name) keys.add(itemRow.name)
        if (itemRow?.desc) keys.add(itemRow.desc)
        if (itemRow?.quality) keys.add(forceCardQualityNameKey(itemRow.quality))
        collectRestrictionTranslationKeys(infoRow?.condition).forEach((key) => keys.add(key))
        parseAttributeKeys(infoRow?.attribute_initial).forEach((key) => keys.add(key))
        ;(developRows || []).forEach((row) => {
          parseAttributeKeys(row.attribute).forEach((key) => keys.add(key))
        })
        collectSkillTranslationKeys(skills || []).forEach((key) => keys.add(key))

        const consumeEntries = collectForceCardConsumeEntries([
          ...nextStarUps,
          ...nextAwakens,
          ...nextReborns,
        ])

        const [translated, preloadedConsumeRefs] = await Promise.all([
          translateKeys(Array.from(keys), lang),
          preloadConsumeRefMap(consumeEntries, lang),
        ])
        if (cancelled) return

        setItem(itemRow)
        setInfo(infoRow || null)
        setLevels(lvRows || [])
        setStarUps(nextStarUps)
        setAwakens(nextAwakens)
        setReborns(nextReborns)
        setTranslations(translated)
        setConsumeRefMap(preloadedConsumeRefs)
      } catch (err) {
        console.error('Error loading ForceCard:', err)
      } finally {
        if (!cancelled) setIsReady(true)
      }
    }

    loadForceCardData()
    return () => {
      cancelled = true
    }
  }, [cardId, lang, parseIds])

  const restrictionChips = useMemo(
    () => buildForceCardRestrictionChips(info?.condition, lang),
    [info?.condition, lang]
  )

  const storyHtml = item?.desc ? applySkillValues(getT(item.desc), 0, {}) : undefined

  const hasProgressionTabs =
    starUps.length > 0 || levels.length > 0 || awakens.length > 0 || reborns.length > 0

  if (!isReady || !isUiReady) {
    return <LoadingSkeleton variant="detail" />
  }

  if (!item) {
    return (
      <div className="panel py-12 text-center">
        <p className="mb-4 text-text-muted">{site('cardNotFound')}</p>
        <Link href={localized('/force-cards')} className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          {t(UI_KEYS.common.loginBack)}
        </Link>
      </div>
    )
  }

  return (
    <>
      <SetPageMeta title={getT(item.name)} />
      <DetailPageShell
        backHref="/force-cards"
        backLabel={t(UI_KEYS.common.loginBack)}
        title={getT(item.name)}
        header={
          <ForceCardDetailHeader
            cardId={item.id}
            quality={item.quality}
            name={getT(item.name)}
            storyHtml={storyHtml}
            restrictionChips={restrictionChips}
            getT={getT}
          />
        }
      >
        {info?.card_star ? (
          <ForceCardOverview info={info} getT={getT} />
        ) : null}
        {hasProgressionTabs ? (
          <ForceCardTabsContainer
            info={info}
            starUps={starUps}
            levels={levels}
            awakens={awakens}
            reborns={reborns}
            cardQuality={item.quality != null ? Number(item.quality) : undefined}
            getT={getT}
            consumeRefMap={consumeRefMap}
            consumeRefReady
          />
        ) : null}
      </DetailPageShell>
    </>
  )
}
