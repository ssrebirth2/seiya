'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { translateKeys } from '@/lib/i18n/language-package'
import { useLanguage } from '@/context/language-context'
import { applySkillValues, loadSkillValues, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import {
  normalizeConditionList,
  normalizeDesValueList,
  normalizeSkillRefList,
  parseGameData,
  parsePrimitiveList,
} from '@/lib/game/parse-game-data'

interface HeroAwakenSkillsProps {
  heroId: number
}

interface SkillLine {
  condition?: string
  text: string
}

export default function HeroAwakenSkills({ heroId }: HeroAwakenSkillsProps) {
  const { lang } = useLanguage()
  const [skills, setSkills] = useState<any[]>([])
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})
  const [labelMap, setLabelMap] = useState<Record<number, string>>({})

  const getT = (key?: string) => translations[key || ''] || key || ''

  useEffect(() => {
    setupGlobalSkillTooltips()
  }, [])

  useEffect(() => {
    const loadAwakenSkills = async () => {
      const { data: cfg } = await supabase
        .from('HeroAwakenConfig')
        .select('awaken_list')
        .eq('id', heroId)
        .maybeSingle()

      if (!cfg) return

      const awakenIds = parseGameData(cfg.awaken_list) as number[]
      if (!awakenIds.length) return

      const { data: awakenInfos } = await supabase
        .from('HeroAwakenInfoConfig')
        .select('add_skill')
        .in('id', awakenIds)

      const allSkillIds: number[] = []
      awakenInfos?.forEach((info) => {
        normalizeSkillRefList(info.add_skill).forEach((a) => {
          if (a.skill_id) allSkillIds.push(a.skill_id)
        })
      })

      if (!allSkillIds.length) return

      const { data: skillRows } = await supabase
        .from('SkillConfig')
        .select('*')
        .in('skillid', allSkillIds as number[])

      if (!skillRows?.length) return

      // Coleta chaves de tradução, valores e IDs de labels
      const tkeys = new Set<string>()
      const usedValueIds = new Set<number>()
      const labelIds = new Set<number>()

      skillRows.forEach((s) => {
        if (s.name?.startsWith('LC_')) tkeys.add(s.name)
        if (s.skill_type) tkeys.add(`LC_SKILL_type_des_${s.skill_type}`)
        parsePrimitiveList(s.label_list).forEach((l) => labelIds.add(Number(l)))

        for (const f of ['skill_des', 'awaken_skill_des'] as const) {
          normalizeDesValueList(s[f]).forEach((it) => {
            if (it.des) tkeys.add(it.des)
            if (it.value != null) usedValueIds.add(Number(it.value))
          })
        }
        normalizeConditionList(s.skill_condition).forEach((c) => tkeys.add(c))
      })

      // Carrega labels e inclui nomes na lista de chaves a traduzir
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
      setSkills(skillRows || [])
    }

    loadAwakenSkills()
  }, [heroId, lang])

  if (!skills.length)
    return <p className="text-sm text-text-muted">No awaken skills found.</p>

  return (
    <section className="mt-6">
      {skills.map((skill) => {
        const name = getT(skill.name)
        const cd = skill.cd === -1 ? '-' : skill.cd
        const skillType = getT(`LC_SKILL_type_des_${skill.skill_type}`)
        const labels = parsePrimitiveList(skill.label_list)
          .map((id) => labelMap[Number(id)])
          .filter(Boolean)
          .join(', ')

        const iconPath = `/assets/resources/textures/hero/skillicon/texture/SkillIcon_${skill.skillid}.png`

        const desList = normalizeDesValueList(skill.skill_des)
        const mainDescription =
          desList.length > 0
            ? applySkillValues(getT(desList[0].des), desList[0].value ?? 0, valuesMap)
            : ''

        const sketches = normalizeDesValueList(skill.awaken_skill_des)
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
          <div
            key={skill.skillid}
            className="mt-4 rounded-xl border border-panel-border bg-panel p-4 shadow-sm first:mt-0 sm:mt-6 sm:p-5"
          >
            <div className="mb-3 flex items-center gap-3 sm:gap-4">
              {iconPath && (
                <img src={iconPath} alt={name} className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20" />
              )}
              <p className="text-lg font-semibold leading-tight sm:text-xl">{name}</p>
            </div>

            <div className="mb-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 sm:gap-4">
              {skillType && <p><strong>Tipo:</strong> {skillType}</p>}
              <p><strong>Cooldown:</strong> {cd}</p>
              {labels && <p><strong>Tags:</strong> {labels}</p>}
            </div>

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
        )
      })}
    </section>
  )
}
