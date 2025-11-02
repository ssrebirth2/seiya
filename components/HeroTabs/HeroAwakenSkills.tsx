'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { translateKeys } from '@/lib/translate'
import { useLanguage } from '@/context/LanguageContext'
import { applySkillValues, loadSkillValues, setupGlobalSkillTooltips } from '@/lib/applySkillValues'

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
    const loadAwakenSkills = async () => {
      const { data: cfg } = await supabase
        .from('HeroAwakenConfig')
        .select('awaken_list')
        .eq('id', heroId)
        .maybeSingle()

      if (!cfg) return

      const awakenIds = safeParse(cfg.awaken_list)
      if (!awakenIds.length) return

      const { data: awakenInfos } = await supabase
        .from('HeroAwakenInfoConfig')
        .select('add_skill')
        .in('id', awakenIds as number[])

      const allSkillIds: number[] = []
      awakenInfos?.forEach((info) => {
        const adds = safeParse(info.add_skill)
        adds.forEach((a: any) => {
          if (a?.skill_id) allSkillIds.push(a.skill_id)
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
        if (Array.isArray(s.label_list)) s.label_list.forEach((l: any) => labelIds.add(Number(l)))

        for (const f of ['skill_des', 'awaken_skill_des', 'skill_condition']) {
          safeParse(s[f]).forEach((it: any) => {
            if (it?.des) tkeys.add(it.des)
            if (it?.condition) tkeys.add(it.condition)
            if (it?.value != null) usedValueIds.add(Number(it.value))
          })
        }
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
    return <p className="text-sm text-[var(--text-muted)]">No awaken skills found.</p>

  return (
    <section className="mt-6">
      {skills.map((skill) => {
        const name = getT(skill.name)
        const cd = skill.cd === -1 ? '-' : skill.cd
        const skillType = getT(`LC_SKILL_type_des_${skill.skill_type}`)
        const labels = Array.isArray(skill.label_list)
          ? skill.label_list.map((id: number) => labelMap[id]).filter(Boolean).join(', ')
          : ''

        const iconPath = skill.iconpath
          ?.replace('Textures/', '/assets/resources/textures/')
          ?.concat('.png')

        // Descrição principal
        const desList = safeParse(skill.skill_des)
        const mainDescription =
          desList.length > 0
            ? applySkillValues(getT(desList[0].des), desList[0].value, valuesMap)
            : ''

        // Sketch (linhas / níveis)
        const sketches = safeParse(skill.awaken_skill_des)
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
          <div
            key={skill.skillid}
            className="mt-6 p-5 border rounded-xl shadow-md backdrop-blur-md"
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
        )
      })}
    </section>
  )
}
