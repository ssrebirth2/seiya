'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { NO_DATA_LC_KEY, SITE_ONLY_LABELS } from '@/lib/i18n/ui-keys'
import { useLanguage } from '@/context/language-context'
import { applySkillValues, loadSkillValues, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import {
  normalizeConditionList,
  normalizeDesValueList,
  parsePrimitiveList,
} from '@/lib/game/parse-game-data'
import { resolveSkillIconUrl } from '@/lib/game/resolve-skill-icon'
import {
  isNotAvailableLabel,
  resolveSkillTypeLabel,
  skillTypeLcKey,
} from '@/lib/game/format-skill-labels'
import SkillCooldownMeta from '@/components/heroes/SkillCooldownMeta'

type CompanionStarSkillProps = {
  skillId: number | null | undefined
}

interface SkillLine {
  condition?: string
  text: string
}

/** Single companion skill — shown expanded (no icon picker). */
export default function CompanionStarSkill({ skillId }: CompanionStarSkillProps) {
  const { lang } = useLanguage()
  const [skill, setSkill] = useState<any>(null)
  const [subskills, setSubskills] = useState<any[]>([])
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})
  const [labelMap, setLabelMap] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)

  const getT = createTranslationGetter(translations)
  const noDataLabel = getT(NO_DATA_LC_KEY)
  const toId = (v: unknown) => String(v)

  useEffect(() => {
    setupGlobalSkillTooltips()
  }, [])

  useEffect(() => {
    if (!skillId) {
      setSkill(null)
      setSubskills([])
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)

      const { data: root } = await supabase
        .from('SkillConfig')
        .select('*')
        .eq('skillid', skillId)
        .maybeSingle()

      if (!root) {
        setSkill(null)
        setSubskills([])
        setLoading(false)
        return
      }

      const subIds = parsePrimitiveList(root.sub_skills).map((sid) => toId(sid))
      let subs: any[] = []
      if (subIds.length > 0) {
        const { data: subData } = await supabase
          .from('SkillConfig')
          .select('*')
          .in('skillid', subIds)
        subs = subData || []
      }

      const allSkills = [root, ...subs]
      const translationKeys = new Set<string>()
      const labelIds = new Set<number>()
      const valueIds = new Set<number>()

      allSkills.forEach((s) => {
        if (s.name?.startsWith('LC_')) translationKeys.add(s.name)
        const typeKey = skillTypeLcKey(s.skill_type)
        if (typeKey) translationKeys.add(typeKey)
        parsePrimitiveList(s.label_list).forEach((l) => labelIds.add(Number(l)))

        for (const field of ['skill_des', 'skill_sketch'] as const) {
          normalizeDesValueList(s[field]).forEach((it) => {
            if (it.des) translationKeys.add(it.des)
            if (it.value != null) valueIds.add(Number(it.value))
          })
        }
        normalizeConditionList(s.skill_condition).forEach((c) => translationKeys.add(c))
      })

      let labelRecords: { id: number; name: string }[] = []
      if (labelIds.size > 0) {
        const { data: labels } = await supabase
          .from('SkillLabelConfig')
          .select('id, name')
          .in('id', Array.from(labelIds))
        labelRecords = labels || []
        labelRecords.forEach((l) => translationKeys.add(l.name))
      }

      const [translated, values] = await Promise.all([
        translateKeys(Array.from(translationKeys), lang),
        loadSkillValues(Array.from(valueIds)),
      ])

      const resolveNoData = createTranslationGetter(translated)
      const lblMap: Record<number, string> = {}
      labelRecords.forEach((l) => {
        lblMap[l.id] = translated[l.name] || resolveNoData(NO_DATA_LC_KEY)
      })

      setSkill(root)
      setSubskills(subs)
      setTranslations(translated)
      setValuesMap(values)
      setLabelMap(lblMap)
      setLoading(false)
    }

    load()
  }, [skillId, lang])

  const renderSkillBlock = (row: any, nested = false) => {
    const name = getT(row.name)
    const skillType = resolveSkillTypeLabel(row.skill_type, getT)
    const labels = parsePrimitiveList(row.label_list)
      .map((id) => labelMap[Number(id)])
      .filter((label) => label && !isNotAvailableLabel(label, noDataLabel))
      .join(', ')

    const desList = normalizeDesValueList(row.skill_des)
    const mainDescription =
      desList.length > 0
        ? (() => {
            const raw = getT(desList[0].des)
            if (isNotAvailableLabel(raw, noDataLabel)) return `<p class="italic">${noDataLabel}</p>`
            return applySkillValues(raw, desList[0].value ?? 0, valuesMap)
          })()
        : ''

    const sketches = normalizeDesValueList(row.skill_sketch)
    const sketchTexts = sketches.map((s) => {
      if (!s.des) return ''
      const raw = getT(s.des)
      if (isNotAvailableLabel(raw, noDataLabel)) return noDataLabel
      return applySkillValues(raw, s.value ?? 0, valuesMap)
    })

    const conds = normalizeConditionList(row.skill_condition)
    const sketchLines: SkillLine[] = Array.from(
      { length: Math.max(sketchTexts.length, conds.length) },
      (_, i) => ({
        text: sketchTexts[i] || '',
        condition: conds[i] ? getT(conds[i]) : '',
      })
    )

    const iconPath = resolveSkillIconUrl(row)

    return (
      <div
        key={`skill-${row.skillid}`}
        className={`rounded-xl border border-panel-border bg-panel p-4 shadow-sm sm:p-5 ${
          nested ? 'mt-4' : ''
        }`}
      >
        <div className="mb-3 flex items-center gap-3 sm:gap-4">
          {iconPath && (
            <img src={iconPath} alt={name} className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20" />
          )}
          <p className="text-lg font-semibold leading-tight sm:text-xl">{name}</p>
        </div>

        <div className="mb-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 sm:gap-4">
          {skillType && (
            <p>
              {isNotAvailableLabel(skillType, noDataLabel) ? (
                <span className="italic text-text-muted">{noDataLabel}</span>
              ) : (
                skillType
              )}
            </p>
          )}
          <SkillCooldownMeta cd={row.cd} />
          {labels && (
            <p>
              <strong>{SITE_ONLY_LABELS.tags}:</strong> {labels}
            </p>
          )}
        </div>

        {mainDescription && (
          <div
            className="mb-3 whitespace-pre-wrap text-sm text-text-muted"
            dangerouslySetInnerHTML={{ __html: mainDescription }}
          />
        )}

        {sketchLines.map((line, i) => (
          <p key={`${row.skillid}-line-${i}`} className="whitespace-pre-wrap text-sm text-text-muted">
            <strong>{i + 1}.</strong>{' '}
            {line.text ? (
              <span dangerouslySetInnerHTML={{ __html: line.text }} />
            ) : (
              <span className="italic">{noDataLabel}</span>
            )}{' '}
            {line.condition && !isNotAvailableLabel(line.condition, noDataLabel) && (
              <span className="italic opacity-70">({line.condition})</span>
            )}
            {line.condition && isNotAvailableLabel(line.condition, noDataLabel) && (
              <span className="italic opacity-70">({noDataLabel})</span>
            )}
          </p>
        ))}
      </div>
    )
  }

  if (!skillId) return null

  if (loading) {
    return <p className="text-sm text-text-muted">Loading skill...</p>
  }

  if (!skill) {
    return <p className="text-sm text-text-muted">Skill not found.</p>
  }

  return (
    <div className="space-y-3">
      {renderSkillBlock(skill)}
      {subskills.map((sub) => renderSkillBlock(sub, true))}
    </div>
  )
}
