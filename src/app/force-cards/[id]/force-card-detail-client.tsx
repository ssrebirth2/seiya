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
import ForceCardTabsContainer from '@/components/force-cards/ForceCardTabsContainer'
import ForceCardOverview from '@/components/force-cards/ForceCardOverview'
import { ForceCardDetailHeader } from '@/components/force-cards/ForceCardDetailHeader'
import { LoadingSkeleton, DetailPageShell } from '@/components/ui/v2'
import { SetPageMeta } from '@/lib/ui/usePageMeta'

export default function ForceCardDetailClient() {
  const { id } = useParams()
  const cardId = Number(id)
  const { lang } = useLanguage()
  const localized = useLocalizedHref()
  const { t, site } = useUiTranslation()

  const [item, setItem] = useState<any>(null)
  const [info, setInfo] = useState<any>(null)
  const [levels, setLevels] = useState<any[]>([])
  const [starUps, setStarUps] = useState<any[]>([])
  const [awakens, setAwakens] = useState<any[]>([])
  const [reborns, setReborns] = useState<any[]>([])
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  const getT = useCallback(
    (key?: string) => createTranslationGetter(translations)(key),
    [translations]
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
      setIsLoading(false)
      return
    }

    const loadForceCardData = async () => {
      setIsLoading(true)
      try {
        const [{ data: itemRow }, { data: infoRow }, { data: lvRows }] = await Promise.all([
          supabase.from('ForceCardItemConfig').select('*').eq('id', cardId).maybeSingle(),
          supabase.from('ForceCardInfoConfig').select('*').eq('id', cardId).maybeSingle(),
          supabase.from('ForceCardLevelConfig').select('*').order('id', { ascending: true }),
        ])

        if (!itemRow) {
          setItem(null)
          return
        }

        setItem(itemRow)
        setInfo(infoRow || null)
        setLevels(lvRows || [])

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

        setStarUps((suRes.data || []).sort((a, b) => a.id - b.id))
        setAwakens((akRes.data || []).sort((a, b) => a.id - b.id))
        setReborns((rbRes.data || []).sort((a, b) => a.id - b.id))

        const keys = new Set<string>()
        if (itemRow?.name) keys.add(itemRow.name)
        if (itemRow?.desc) keys.add(itemRow.desc)
        if (itemRow?.quality) keys.add(forceCardQualityNameKey(itemRow.quality))
        collectRestrictionTranslationKeys(infoRow?.condition).forEach((key) => keys.add(key))

        const translated = await translateKeys(Array.from(keys), lang)
        setTranslations(translated)
      } catch (err) {
        console.error('Error loading ForceCard:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadForceCardData()
  }, [cardId, lang, parseIds])

  const restrictionChips = useMemo(
    () => buildForceCardRestrictionChips(info?.condition, lang),
    [info?.condition, lang]
  )

  const storyHtml = item?.desc ? applySkillValues(getT(item.desc), 0, {}) : undefined

  const hasProgressionTabs =
    starUps.length > 0 || levels.length > 0 || awakens.length > 0 || reborns.length > 0

  if (isLoading) {
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
          />
        ) : null}
      </DetailPageShell>
    </>
  )
}
