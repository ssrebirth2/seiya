'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { translateKeys } from '@/lib/translate'
import { applySkillValues, loadSkillValues, setupGlobalSkillTooltips } from '@/lib/applySkillValues'

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

  const safeParse = (data: any): any[] => {
    if (!data) return []
    try {
      if (typeof data === 'string') return JSON.parse(data)
      if (Array.isArray(data)) return data
      if (typeof data === 'object' && (data.des || data.value)) return [data]
    } catch {
      return []
    }
    return []
  }

  const getT = (key?: string) => translations[key || ''] || key || ''

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
      const skillId =
        typeof lastInfo === 'string'
          ? parseInt(lastInfo)
          : Array.isArray(lastInfo)
          ? lastInfo.at(-1)?.skill_id
          : lastInfo?.skill_id

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
      if (skillRow.skill_type) tkeys.add(`LC_SKILL_type_des_${skillRow.skill_type}`)

      // === PARTE CRÍTICA: label_list pode ser string JSON ===
      safeParse(skillRow.label_list).forEach((l: any) => labelIds.add(Number(l)))

      for (const f of ['skill_des', 'skill_sketch', 'skill_condition']) {
        safeParse(skillRow[f]).forEach((it: any) => {
          if (it?.des) tkeys.add(it.des)
          if (it?.condition) tkeys.add(it.condition)
          if (it?.value != null) usedValueIds.add(Number(it.value))
        })
      }

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
    return <p className="text-sm text-[var(--text-muted)]">No quality skill found.</p>

  const name = getT(skill.name)
  const cd = skill.cd === -1 ? '-' : skill.cd
  const skillType = getT(`LC_SKILL_type_des_${skill.skill_type}`)

  // === PARTE CRÍTICA: renderizar tags a partir de label_list (string/array) ===
  const labels = safeParse(skill.label_list)
    .map((id: any) => labelMap[Number(id)])
    .filter(Boolean)
    .join(', ')

  const iconPath = `/assets/resources/textures/hero/skillicon/texture/SkillIcon_${skill.skillid}.png`

  const desList = safeParse(skill.skill_des)
  const mainDescription =
    desList.length > 0
      ? applySkillValues(getT(desList[0].des), desList[0].value, valuesMap)
      : ''

  const sketches = safeParse(skill.skill_sketch)
    .map((s: any) => applySkillValues(getT(s.des), s.value, valuesMap))
    .filter(Boolean)

  const conds = safeParse(skill.skill_condition).map((c: any) =>
    typeof c === 'string' ? c : c?.condition || ''
  )

  const sketchLines: SkillLine[] = Array.from(
    { length: Math.max(sketches.length, conds.length) },
    (_, i) => ({
      text: sketches[i] || '',
      condition: conds[i] ? getT(conds[i]) : ''
    })
  )

  return (
    <section className="mt-6">
      <div
        className="p-5 border rounded-xl shadow-md backdrop-blur-md"
        style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--panel-border)' }}
      >
        <div className="flex items-center gap-4 mb-3">
          {iconPath && (
            <img src={iconPath} alt={name} className="w-20 h-20 object-contain" />
          )}
          <p className="text-xl font-semibold">{name}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm mb-2">
          {skillType && <p><strong>Tipo:</strong> {skillType}</p>}
          <p><strong>Cooldown:</strong> {cd}</p>
          {labels && <p><strong>Tags:</strong> {labels}</p>}
        </div>

        {mainDescription && (
          <div
            className="text-sm text-[var(--text-muted)] whitespace-pre-wrap mb-3"
            dangerouslySetInnerHTML={{ __html: mainDescription }}
          />
        )}

        {sketchLines.map((line, i) => (
          <p
            key={`${skill.skillid}-line-${i}`}
            className="text-sm text-[var(--text-muted)] whitespace-pre-wrap"
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
