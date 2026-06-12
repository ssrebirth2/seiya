'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter, NOT_AVAILABLE_LABEL } from '@/lib/i18n/language-package'
import { applySkillValues, loadSkillValues, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import {
  extractSkillIdFromInfo,
  normalizeConditionList,
  normalizeDesValueList,
  parsePrimitiveList,
} from '@/lib/game/parse-game-data'
import { resolveSkillIconUrl } from '@/lib/game/resolve-skill-icon'
import { resolveSkillTypeLabel, skillTypeLcKey } from '@/lib/game/format-skill-labels'
import SkillCooldownMeta from './SkillCooldownMeta'
import { SITE_ONLY_LABELS } from '@/lib/i18n/ui-keys'

interface HeroQualitySkillProps {
  heroId: number
}

interface SkillLine {
  condition?: string
  text: string
}

export default function HeroQualitySkill({ heroId }: HeroQualitySkillProps) {
  const { lang } = useLanguage()
  const [skill, setSkill] = useState<any>(null)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})
  const [labelMap, setLabelMap] = useState<Record<number, string>>({})

  const getT = createTranslationGetter(translations)

  useEffect(() => {
    setupGlobalSkillTooltips()
  }, [])

  useEffect(() => {
    const loadQualitySkill = async () => {
      const { data: heroRow } = await supabase
        .from('HeroConfig')
        .select('hero_quality_skill_ids')
        .eq('id', heroId)
        .maybeSingle()

      if (!heroRow?.hero_quality_skill_ids?.length) return

      const qualityIds = heroRow.hero_quality_skill_ids
      const { data: qualityRows } = await supabase
        .from('HeroQualitySkillConfig')
        .select('*')
        .in('id', qualityIds as number[])

      if (!qualityRows?.length) return

      const lastInfo = qualityRows[qualityRows.length - 1].skill_info
      const skillId = extractSkillIdFromInfo(lastInfo)

      if (!skillId) return

      const { data: skillRow } = await supabase
        .from('SkillConfig')
        .select('*')
        .eq('skillid', skillId)
        .maybeSingle()

      if (!skillRow) return

      // Coleta chaves + values + labels (tratando label_list como string/array)
      const tkeys = new Set<string>()
      const usedValueIds = new Set<number>()
      const labelIds = new Set<number>()

      if (skillRow.name?.startsWith('LC_')) tkeys.add(skillRow.name)
      if (skillRow.skill_type) {
        const typeKey = skillTypeLcKey(skillRow.skill_type)
        if (typeKey) tkeys.add(typeKey)
      }

      // === PARTE CRÍTICA: label_list pode ser string JSON ===
      parsePrimitiveList(skillRow.label_list).forEach((l) => labelIds.add(Number(l)))

      for (const f of ['skill_des', 'skill_sketch'] as const) {
        normalizeDesValueList(skillRow[f]).forEach((it) => {
          if (it.des) tkeys.add(it.des)
          if (it.value != null) usedValueIds.add(Number(it.value))
        })
      }
      normalizeConditionList(skillRow.skill_condition).forEach((c) => tkeys.add(c))

      // Carrega labels e inclui nomes nas chaves a traduzir
      let labelRecords: any[] = []
      if (labelIds.size > 0) {
        const { data: labels } = await supabase
          .from('SkillLabelConfig')
          .select('id, name')
          .in('id', Array.from(labelIds))
        labelRecords = labels || []
        labelRecords.forEach((l) => tkeys.add(l.name))
      }

      const tmap = await translateKeys(Array.from(tkeys), lang)
      const vals = await loadSkillValues(Array.from(usedValueIds))

      const lblMap: Record<number, string> = {}
      labelRecords.forEach((l) => (lblMap[l.id] = tmap[l.name] || l.name))

      setTranslations(tmap)
      setValuesMap(vals)
      setLabelMap(lblMap)
      setSkill(skillRow)
    }

    loadQualitySkill()
  }, [heroId, lang])

  if (!skill)
    return <p className="text-sm text-text-muted">No quality skill found.</p>

  const name = getT(skill.name)
  const skillType = resolveSkillTypeLabel(skill.skill_type, getT)

  // === PARTE CRÍTICA: renderizar tags a partir de label_list (string/array) ===
  const labels = parsePrimitiveList(skill.label_list)
    .map((id) => labelMap[Number(id)])
    .filter(Boolean)
    .join(', ')

  const iconPath = resolveSkillIconUrl(skill)

  const desList = normalizeDesValueList(skill.skill_des)
  const mainDescription =
    desList.length > 0
      ? applySkillValues(getT(desList[0].des), desList[0].value ?? 0, valuesMap)
      : ''

  const sketches = normalizeDesValueList(skill.skill_sketch)
    .map((s) => applySkillValues(getT(s.des), s.value ?? 0, valuesMap))
    .filter(Boolean)

  const conds = normalizeConditionList(skill.skill_condition)

  const sketchLines: SkillLine[] = Array.from(
    { length: Math.max(sketches.length, conds.length) },
    (_, i) => ({
      text: sketches[i] || '',
      condition: conds[i] ? getT(conds[i]) : ''
    })
  )

  return (
    <section className="mt-6">
      <div className="rounded-xl border border-panel-border bg-panel p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-3 sm:gap-4">
          {iconPath && (
            <img src={iconPath} alt={name} className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20" />
          )}
          <p className="text-lg font-semibold leading-tight sm:text-xl">{name}</p>
        </div>

        <div className="mb-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 sm:gap-4">
          {skillType && <p>{skillType}</p>}
          <SkillCooldownMeta cd={skill.cd} />
          {labels && (
            <p>
              <strong>{SITE_ONLY_LABELS.tags}:</strong> {labels}
            </p>
          )}
        </div>

        {mainDescription && (
          <div
            className="text-sm text-text-muted whitespace-pre-wrap mb-3"
            dangerouslySetInnerHTML={{ __html: mainDescription }}
          />
        )}

        {sketchLines.map((line, i) => (
          <p
            key={`${skill.skillid}-line-${i}`}
            className="text-sm text-text-muted whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: `<strong>${i + 1}.</strong> ${line.text} ${
                line.condition ? `<span class='italic opacity-70'>(${line.condition})</span>` : ''
              }`
            }}
          />
        ))}
      </div>
    </section>
  )
}
