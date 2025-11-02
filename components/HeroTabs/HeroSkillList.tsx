'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { translateKeys } from '@/lib/translate'
import { useLanguage } from '@/context/LanguageContext'
import { applySkillValues, loadSkillValues, setupGlobalSkillTooltips } from '@/lib/applySkillValues'

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
  const getT = (key?: string) => translations[key || ''] || key || ''

  const safeParse = (val: any): any[] => {
    if (!val) return []
    try {
      if (typeof val === 'string') return JSON.parse(val)
      if (Array.isArray(val)) return val
      if (typeof val === 'object' && val !== null) {
        if ('des' in val || 'value' in val) return [val]
      }
    } catch {
      return []
    }
    return []
  }

  useEffect(() => {
    setupGlobalSkillTooltips()
  }, [])

  useEffect(() => {
    const loadData = async () => {
      const { map, translations } = await loadSkills()
      const usedValueIds = new Set<number>()

      map.forEach(skill => {
        for (const field of ['skill_des', 'skill_sketch', 'skill_star_des', 'skill_sketch_short']) {
          safeParse(skill[field]).forEach((it: any) => {
            if (it?.value != null) usedValueIds.add(Number(it.value))
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
      roots.forEach(r => safeParse(r.sub_skills).forEach((sid) => subIds.add(toId(sid))))

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
        if (s.skill_type) translationKeys.add(`LC_SKILL_type_des_${s.skill_type}`)
        if (Array.isArray(s.label_list)) s.label_list.forEach((l: any) => labelIds.add(Number(l)))

        for (const f of ['skill_des', 'skill_sketch', 'skill_condition']) {
          safeParse(s[f]).forEach((it: any) => {
            if (it?.des) translationKeys.add(it.des)
            if (it?.condition) translationKeys.add(it.condition)
          })
        }
      })

      let labelRecords: any[] = []
      if (labelIds.size > 0) {
        const { data: labels } = await supabase.from('SkillLabelConfig').select('id, name').in('id', Array.from(labelIds))
        labelRecords = labels || []
        labelRecords.forEach((l) => translationKeys.add(l.name))
      }

      const translated = await translateKeys(Array.from(translationKeys), lang)
      const lblMap: Record<number, string> = {}
      labelRecords.forEach((l) => (lblMap[l.id] = translated[l.name] || l.name))
      setLabelMap(lblMap)

      return { map: byId, translations: translated }
    }

    loadData()
  }, [skillIds, lang])

  const renderSkillDetails = (skill: any): React.ReactElement => {
    const skillid = skill.skillid
    const name = getT(skill.name)
    const cd = skill.cd === -1 ? '-' : skill.cd
    const skillType = getT(`LC_SKILL_type_des_${skill.skill_type}`)
    const labels = Array.isArray(skill.label_list)
      ? skill.label_list.map((id: number) => labelMap[id]).filter(Boolean).join(', ')
      : ''

    const desList = safeParse(skill.skill_des)
    const mainDescription = desList.length > 0
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

    const subskills = safeParse(skill.sub_skills)
      .map(toId)
      .map(id => skills.get(id))
      .filter(Boolean)

    const iconPath = `/assets/resources/textures/Hero/skillIcon/texture/skillIcon_${skill.skillid}.png`

    return (
      <div
        key={`skill-${skill.skillid}`}
        className="mt-6 p-5 border rounded-xl shadow-md backdrop-blur-md"
        style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--panel-border)' }}
      >
        <div className="flex items-center gap-4 mb-3">
          {iconPath && <img src={iconPath} alt={name} className="w-20 h-20 object-contain" />}
          <p className="text-xl font-semibold">{name}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm mb-2">
          {skillType && <p><strong>Tipo:</strong> {skillType}</p>}
          <p><strong>Cooldown:</strong> {cd}</p>
          {labels && <p><strong>Tags:</strong> {labels}</p>}
        </div>

        {mainDescription && (
          <div className="text-sm text-[var(--text-muted)] whitespace-pre-wrap mb-3"
            dangerouslySetInnerHTML={{ __html: mainDescription }} />
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
    <section className="mt-6">
      <div className="flex flex-wrap justify-center gap-6 mb-4">
        {rootSkills.map(skill => {
          const iconPath = `/assets/resources/textures/Hero/skillIcon/texture/skillIcon_${skill.skillid}.png`
          const name = getT(skill.name)
          const isActive = activeSkillId === toId(skill.skillid)

          return (
            <button
              key={`root-${skill.skillid}`}
              onClick={() => setActiveSkillId(toId(skill.skillid))}
              className={`relative p-1 rounded-xl border transition-all duration-200 hover:scale-105
                ${isActive ? 'border-blue-400 shadow-md' : 'border-[var(--panel-border)]'}`}
              style={{ backgroundColor: 'var(--panel)' }}
            >
              {iconPath && <img src={iconPath} alt={name} className="w-20 h-20 object-contain" />}
            </button>
          )
        })}
      </div>

      {activeSkillId && skills.has(activeSkillId) && renderSkillDetails(skills.get(activeSkillId))}
    </section>
  )
}
