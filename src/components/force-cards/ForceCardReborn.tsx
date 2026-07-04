'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys } from '@/lib/i18n/language-package'
import {
  applySkillValues,
  loadSkillValues,
  setupGlobalSkillTooltips,
} from '@/lib/game/apply-skill-values'
import {
  normalizeDesValueList,
  normalizeConsumeList,
  normalizeSkillRefList,
} from '@/lib/game/parse-game-data'
import { ForceCardMaterialPanel } from '@/components/force-cards/ForceCardMaterialPanel'
import { ForceCardSkillTableHeader } from '@/components/force-cards/ForceCardSkillTableHeader'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { useConsumeRefMap, EMPTY_CONSUME_ENTRIES } from '@/hooks/use-consume-ref-map'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'

type Props = {
  reborns: any[]
  cardQuality?: number
  getT?: (key?: string) => string
  consumeRefMap?: ConsumeRefMap
  consumeRefReady?: boolean
}

type SkillConfig = {
  skillid: number | string
  name?: string
  skill_des?: unknown
  skill_sketch?: unknown
}

export default function ForceCardReborn({
  reborns,
  cardQuality,
  getT: externalGetT,
  consumeRefMap: externalConsumeRefMap,
  consumeRefReady: externalConsumeRefReady,
}: Props) {
  const { lang } = useLanguage()
  const { t } = useUiTranslation()
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [skillsById, setSkillsById] = useState<Map<string, SkillConfig>>(new Map())
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})
  const [skillsReady, setSkillsReady] = useState(false)

  const getT = useMemo(() => {
    if (externalGetT) return externalGetT
    return (key?: string) => (key ? translations[key] || '' : '')
  }, [externalGetT, translations])

  useEffect(() => setupGlobalSkillTooltips(), [])

  const validReborns = useMemo(
    () => (Array.isArray(reborns) ? [...reborns].sort((a, b) => a.id - b.id) : []),
    [reborns]
  )

  const allConsumeEntries = useMemo(() => {
    const entries = []
    for (const row of validReborns) {
      entries.push(...normalizeConsumeList(row.consume))
    }
    return entries
  }, [validReborns])

  const internalConsumeRef = useConsumeRefMap(
    externalConsumeRefMap ? EMPTY_CONSUME_ENTRIES : allConsumeEntries
  )
  const consumeRefMap = externalConsumeRefMap ?? internalConsumeRef.consumeRefMap
  const consumeRefReady = externalConsumeRefReady ?? internalConsumeRef.ready

  const targetSkillIds = useMemo(() => {
    const ids = new Set<string>()
    for (const row of validReborns) {
      const ups = normalizeSkillRefList(row?.skill_up)
      const id = ups[0]?.skill_id
      if (id != null) ids.add(String(id))
    }
    return Array.from(ids)
  }, [validReborns])

  useEffect(() => {
    const load = async () => {
      setSkillsReady(false)
      if (!targetSkillIds.length) {
        setSkillsById(new Map())
        setValuesMap({})
        setTranslations({})
        setSkillsReady(true)
        return
      }

      const { data: skills } = await supabase
        .from('SkillConfig')
        .select('*')
        .in('skillid', targetSkillIds)

      const all: SkillConfig[] = skills || []
      if (!externalGetT) {
        const tKeys = new Set<string>()
        all.forEach((s) => {
          if (s.name?.startsWith?.('LC_')) tKeys.add(s.name)
          normalizeDesValueList(s.skill_des).forEach((d) => d.des && tKeys.add(d.des))
          normalizeDesValueList(s.skill_sketch).forEach((d) => d.des && tKeys.add(d.des))
        })
        setTranslations(await translateKeys(Array.from(tKeys), lang))
      }

      const valueIds = new Set<number>()
      all.forEach((s) => {
        ;['skill_des', 'skill_sketch'].forEach((field) => {
          normalizeDesValueList((s as Record<string, unknown>)[field]).forEach((node) => {
            const v = Number(node.value)
            if (!Number.isNaN(v)) valueIds.add(v)
          })
        })
      })
      setValuesMap(await loadSkillValues(Array.from(valueIds)))
      setSkillsById(new Map(all.map((s) => [String(s.skillid), s])))
      setSkillsReady(true)
    }
    load()
  }, [targetSkillIds, lang, externalGetT])

  const renderSkillSketch = (skill: SkillConfig | undefined, lv: number) => {
    if (!skill) return '-'
    const sketches = normalizeDesValueList(skill.skill_sketch)
    const entry = sketches.find((_, i) => i + 1 === lv) ?? sketches[sketches.length - 1]
    if (!entry?.des) return '-'
    const html = applySkillValues(getT(entry.des), entry.value ?? 0, valuesMap)
    return <span dangerouslySetInnerHTML={{ __html: html }} />
  }

  if (!skillsReady) {
    return (
      <div role="status" aria-live="polite" className="py-4">
        <div className="skeleton-block h-40 w-full rounded-xl" aria-hidden />
      </div>
    )
  }

  if (!validReborns.length) {
    return (
      <div className="force-card-progression-empty">
        <p>{t(UI_KEYS.forceCard.noProgressionData)}</p>
      </div>
    )
  }

  return (
    <div className="force-card-progression-table">
      <table>
        <ForceCardSkillTableHeader showRecycle={false} />
        <tbody>
          {validReborns.map((row) => {
            const skillData = normalizeSkillRefList(row.skill_up)
            const skill = skillsById.get(String(skillData[0]?.skill_id))
            const skillLv = Number(skillData[0]?.skill_lv ?? 0)
            const cardId = row.item_id ?? (row.id > 10 ? Math.floor(row.id / 10) : undefined)

            return (
              <tr key={row.id}>
                <td data-label={t(UI_KEYS.common.grade)}>
                  <span className="force-card-progression-copies tabular-nums">{skillLv}</span>
                </td>
                <td data-label={t(UI_KEYS.forceCard.effect)}>
                  <div className="force-card-progression-effect">
                    {renderSkillSketch(skill, skillLv)}
                  </div>
                </td>
                <td data-label={t(UI_KEYS.common.consume)}>
                  <ForceCardMaterialPanel
                    cardId={cardId}
                    cardQuality={cardQuality ?? 1}
                    configId={row.id}
                    consume={row.consume}
                    consumeCurrency={row.consume_currency}
                    sections="consume"
                    showSectionLabels={false}
                    layout="inline"
                    consumeRefMap={consumeRefMap}
                    consumeRefReady={consumeRefReady}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
