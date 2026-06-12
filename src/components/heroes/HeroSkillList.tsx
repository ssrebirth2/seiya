'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { NO_DATA_LC_KEY, SITE_ONLY_LABELS } from '@/lib/i18n/ui-keys'
import { useLanguage } from '@/context/language-context'
import { applySkillValues, loadSkillValues, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import {
  normalizeConditionList,
  normalizeDesValueList,
  parseGameData,
  parsePrimitiveList,
} from '@/lib/game/parse-game-data'
import { resolveSkillIconUrl } from '@/lib/game/resolve-skill-icon'
import {
  isNotAvailableLabel,
  resolveSkillTypeLabel,
  skillTypeLcKey,
} from '@/lib/game/format-skill-labels'
import SkillCooldownMeta from './SkillCooldownMeta'

interface HeroSkillListProps {
  skillIds: (number | string)[]
}

interface SkillLine {
  condition?: string
  text: string
}

export default function HeroSkillList({ skillIds }: HeroSkillListProps) {
  const { lang } = useLanguage()
  const [skills, setSkills] = useState<Map<string, any>>(new Map())
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})
  const [labelMap, setLabelMap] = useState<Record<number, string>>({})
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null)

  const toId = (v: unknown) => String(v)
  const getT = createTranslationGetter(translations)
  const noDataLabel = getT(NO_DATA_LC_KEY)

  useEffect(() => {
    setupGlobalSkillTooltips()
  }, [])

  useEffect(() => {
    const loadData = async () => {
      const { map, translations } = await loadSkills()
      const usedValueIds = new Set<number>()

      map.forEach(skill => {
        for (const field of ['skill_des', 'skill_sketch', 'skill_star_des', 'skill_sketch_short'] as const) {
          normalizeDesValueList(skill[field]).forEach((it) => {
            if (it.value != null) usedValueIds.add(Number(it.value))
          })
        }
      })

      const valueMap = await loadSkillValues(Array.from(usedValueIds))
      setSkills(map)
      setTranslations(translations)
      setValuesMap(valueMap)
    }

    const loadSkills = async (): Promise<{ map: Map<string, any>; translations: Record<string, string> }> => {
      if (!skillIds.length) return { map: new Map(), translations: {} }

      const ids = skillIds.map(toId)
      const { data: roots } = await supabase.from('SkillConfig').select('*').in('skillid', ids)
      if (!roots?.length) return { map: new Map(), translations: {} }

      const subIds = new Set<string>()
      roots.forEach(r => parsePrimitiveList(r.sub_skills).forEach((sid) => subIds.add(toId(sid))))

      let subs: any[] = []
      if (subIds.size > 0) {
        const { data: subData } = await supabase.from('SkillConfig').select('*').in('skillid', Array.from(subIds))
        subs = subData || []
      }

      const allSkills = [...roots, ...subs]
      const byId = new Map<string, any>(allSkills.map(s => [toId(s.skillid), s]))

      const translationKeys = new Set<string>()
      const labelIds = new Set<number>()

      allSkills.forEach((s) => {
        if (s.name?.startsWith('LC_')) translationKeys.add(s.name)
        const typeKey = skillTypeLcKey(s.skill_type)
        if (typeKey) translationKeys.add(typeKey)
        parsePrimitiveList(s.label_list).forEach((l) => labelIds.add(Number(l)))

        for (const f of ['skill_des', 'skill_sketch'] as const) {
          normalizeDesValueList(s[f]).forEach((it) => {
            if (it.des) translationKeys.add(it.des)
          })
        }
        normalizeConditionList(s.skill_condition).forEach((c) => translationKeys.add(c))
      })

      let labelRecords: any[] = []
      if (labelIds.size > 0) {
        const { data: labels } = await supabase.from('SkillLabelConfig').select('id, name').in('id', Array.from(labelIds))
        labelRecords = labels || []
        labelRecords.forEach((l) => translationKeys.add(l.name))
      }

      const translated = await translateKeys(Array.from(translationKeys), lang)
      const lblMap: Record<number, string> = {}
      const resolveNoData = createTranslationGetter(translated)
      labelRecords.forEach((l) => (lblMap[l.id] = translated[l.name] || resolveNoData(NO_DATA_LC_KEY)))
      setLabelMap(lblMap)

      return { map: byId, translations: translated }
    }

    loadData()
  }, [skillIds, lang])

  const renderSkillDetails = (skill: any): React.ReactElement => {
    const skillid = skill.skillid
    const name = getT(skill.name)
    const skillType = resolveSkillTypeLabel(skill.skill_type, getT)
    const labels = parsePrimitiveList(skill.label_list)
      .map((id) => labelMap[Number(id)])
      .filter((label) => label && !isNotAvailableLabel(label))
      .join(', ')

    const desList = normalizeDesValueList(skill.skill_des)
    const mainDescription = desList.length > 0
      ? (() => {
          const raw = getT(desList[0].des)
          if (isNotAvailableLabel(raw, noDataLabel)) return `<p class="italic">${noDataLabel}</p>`
          return applySkillValues(raw, desList[0].value ?? 0, valuesMap)
        })()
      : ''

    const sketches = normalizeDesValueList(skill.skill_sketch)
    const sketchTexts = sketches.map((s) => {
      if (!s.des) return ''
      const raw = getT(s.des)
      if (isNotAvailableLabel(raw, noDataLabel)) return noDataLabel
      return applySkillValues(raw, s.value ?? 0, valuesMap)
    })

    const conds = normalizeConditionList(skill.skill_condition)

    const sketchLines: SkillLine[] = Array.from(
      { length: Math.max(sketchTexts.length, conds.length) },
      (_, i) => ({
        text: sketchTexts[i] || '',
        condition: conds[i] ? getT(conds[i]) : '',
      })
    )

    const subskills = parsePrimitiveList(skill.sub_skills)
      .map(toId)
      .map(id => skills.get(id))
      .filter(Boolean)

    // Usar iconpath do Supabase convertido, com fallback para o caminho antigo
    const iconPath = resolveSkillIconUrl(skill)

    return (
      <div
        key={`skill-${skill.skillid}`}
        className="mt-4 sm:mt-6 rounded-xl border border-panel-border bg-panel p-4 shadow-sm sm:p-5"
      >
        <div className="mb-3 flex items-center gap-3 sm:gap-4">
          {iconPath && <img src={iconPath} alt={name} className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20" />}
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
          <SkillCooldownMeta cd={skill.cd} />
          {labels && (
            <p>
              <strong>{SITE_ONLY_LABELS.tags}:</strong> {labels}
            </p>
          )}
        </div>

        {mainDescription && (
          <div className="text-sm text-text-muted whitespace-pre-wrap mb-3"
            dangerouslySetInnerHTML={{ __html: mainDescription }} />
        )}

        {sketchLines.map((line, i) => (
          <p
            key={`${skill.skillid}-line-${i}`}
            className="text-sm text-text-muted whitespace-pre-wrap"
          >
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

        {subskills.length > 0 && (
          <div className="mt-4 space-y-3">
            {subskills.map((sub) => (
              <div key={`sub-${sub.skillid}`}>
                {renderSkillDetails(sub)}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const rootSkills = Array.from(skills.values()).filter((s) =>
    skillIds.map(String).includes(String(s.skillid))
  )

  if (!skills.size) return null

  return (
    <section className="mt-2 sm:mt-4">
      <div className="mb-4 flex flex-wrap justify-center gap-3 sm:gap-6">
        {rootSkills.map(skill => {
          // Usar iconpath do Supabase convertido, com fallback para o caminho antigo
          const iconPath = resolveSkillIconUrl(skill)
          const name = getT(skill.name)
          const isActive = activeSkillId === toId(skill.skillid)

          return (
            <button
              key={`root-${skill.skillid}`}
              onClick={() => setActiveSkillId(toId(skill.skillid))}
              className={`relative rounded-xl border bg-panel p-1 transition-all duration-200 hover:scale-105
                ${isActive ? 'border-accent shadow-md' : 'border-panel-border'}`}
            >
              {iconPath && <img src={iconPath} alt={name} className="h-16 w-16 object-contain sm:h-20 sm:w-20" />}
            </button>
          )
        })}
      </div>

      {activeSkillId && skills.has(activeSkillId) && renderSkillDetails(skills.get(activeSkillId))}
    </section>
  )
}