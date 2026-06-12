'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { forceCardQualityNameKey, SITE_ONLY_LABELS } from '@/lib/i18n/ui-keys'
import { useLanguage } from '@/context/language-context'
import { applySkillValues, formatDisplayText } from '@/lib/game/apply-skill-values'
import ForceCardTabsContainer from '@/components/force-cards/ForceCardTabsContainer'
import ForceCardImage from '@/components/ui/ForceCardImage'

export default function ForceCardDetailPage() {
  const { id } = useParams()
  const cardId = Number(id)
  const { lang } = useLanguage()
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
        if (itemRow?.quality)
          keys.add(forceCardQualityNameKey(itemRow.quality))

        if (infoRow?.condition) {
          try {
            const conds = JSON.parse(infoRow.condition)
            if (Array.isArray(conds)) {
              conds.forEach(({ type, object_id }) => {
                if (type && Array.isArray(object_id)) {
                  object_id.forEach((oid: number) => keys.add(`LC_HERO_${type}_${oid}`))
                }
              })
            }
          } catch {
            /* ignore parse errors */
          }
        }

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

  const restrictionHtml = useMemo(() => {
    if (!info?.condition) return ''

    try {
      const conds = JSON.parse(info.condition)
      const specialFields = ['occupation', 'stance', 'damagetype', 'camp']
      const rendered: string[] = []

      conds.forEach(({ type, object_id }: any) => {
        if (specialFields.includes(type)) {
          object_id?.forEach((oid: number) => {
            const labelKey = `LC_HERO_${type}_${oid}`
            rendered.push(formatDisplayText(getT(labelKey), 0, {}))
          })
        }
      })

      return rendered.join(', ')
    } catch {
      return ''
    }
  }, [info, translations, getT])

  const qualityLabel = item ? getT(forceCardQualityNameKey(item.quality)) : ''

  const statEntries = useMemo(() => {
    if (!item) return []
    const entries: { key: string; label: string; value: string; html?: boolean }[] = []

    if (qualityLabel)
      entries.push({ key: 'quality', label: t(UI_KEYS.common.quality), value: qualityLabel })
    if (restrictionHtml) {
      entries.push({
        key: 'restriction',
        label: t(UI_KEYS.forceCard.restriction),
        value: restrictionHtml,
        html: true,
      })
    }
    return entries
  }, [item, qualityLabel, restrictionHtml, t, site])

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner h-10 w-10" />
          <p className="text-sm text-text-muted">{t(UI_KEYS.common.loading)}</p>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="panel py-12 text-center">
        <p className="mb-4 text-text-muted">{site('cardNotFound')}</p>
        <Link href="/force-cards" className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          {site('backToForceCards')}
        </Link>
      </div>
    )
  }

  return (
    <div className="page-stack -mx-2 sm:mx-0">
      <section className="panel">
        <Link
          href="/force-cards"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-text-muted transition hover:text-foreground sm:text-sm"
        >
          <ArrowLeft size={14} className="shrink-0" />
          {site('backToForceCards')}
        </Link>

        <div className="flex flex-col items-start gap-6 md:flex-row">
          <ForceCardImage
            cardId={item.id}
            quality={item.quality}
            alt={getT(item.name)}
            className="mx-auto w-48 shrink-0 sm:w-56 md:mx-0"
          />

          <div className="min-w-0 flex-1 space-y-2 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              {qualityLabel && <span className="badge-accent">{qualityLabel}</span>}
              <span className="text-xs text-text-muted">ID {item.id}</span>
            </div>
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{getT(item.name)}</h1>
          </div>
        </div>
      </section>

      {item.desc && (
        <section className="panel">
          <div
            className="text-sm leading-relaxed text-text-muted"
            dangerouslySetInnerHTML={{
              __html: applySkillValues(getT(item.desc), 0, {}),
            }}
          />
        </section>
      )}

      {statEntries.length > 0 && (
        <section className="panel">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
            {t(UI_KEYS.common.baseAttribute)}
          </h2>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {statEntries.map(({ key, label, value, html }) => (
              <div
                key={key}
                className="rounded-lg border border-panel-border bg-panel-hover/50 px-3 py-2.5"
              >
                <dt className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                  {label}
                </dt>
                {html ? (
                  <dd
                    className="text-sm font-semibold leading-snug break-words text-foreground"
                    dangerouslySetInnerHTML={{ __html: value }}
                  />
                ) : (
                  <dd className="text-sm font-semibold leading-snug break-words text-foreground">
                    {value}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </section>
      )}

      {info ? (
        <section className="panel !p-0 sm:!p-0 overflow-hidden">
          <ForceCardTabsContainer
            info={info}
            starUps={starUps}
            levels={levels}
            awakens={awakens}
            reborns={reborns}
          />
        </section>
      ) : (
        <section className="panel text-center text-sm text-text-muted">
          No progression data available for this card.
        </section>
      )}
    </div>
  )
}
