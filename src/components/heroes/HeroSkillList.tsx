'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { translateKeys } from '@/lib/i18n/language-package'
import { useLanguage } from '@/context/language-context'
import { applySkillValues, loadSkillValues, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import {
  normalizeConditionList,
  normalizeDesValueList,
  parseGameData,
  parsePrimitiveList,
} from '@/lib/game/parse-game-data'

interface HeroSkillListProps {
  skillIds: (number | string)[]
}

interface SkillLine {
  condition?: string
  text: string
}

// Fun??o auxiliar para converter o caminho bruto do Supabase para o formato de asset
const convertIconPath = (rawPath?: string): string => {
  if (!rawPath) return ''

  // Remove barra inicial, se houver
  const cleanPath = rawPath.replace(/^\/+/, '')
  const lastSlashIndex = cleanPath.lastIndexOf('/')
  let dir = ''
  let file = cleanPath

  if (lastSlashIndex !== -1) {
    dir = cleanPath.substring(0, lastSlashIndex)
    file = cleanPath.substring(lastSlashIndex + 1)
  }

  // Converte o diret?rio para letras min?sculas
  const lowerDir = dir.toLowerCase()

  // Monta o caminho final com prefixo e extens?o .png
  return `/assets/resources/${lowerDir}/${file}.png`
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
        if (s.skill_type) translationKeys.add(`LC_SKILL_type_des_${s.skill_type}`)
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
    const labels = parsePrimitiveList(skill.label_list)
      .map((id) => labelMap[Number(id)])
      .filter(Boolean)
      .join(', ')

    const desList = normalizeDesValueList(skill.skill_des)
    const mainDescription = desList.length > 0
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

    const subskills = parsePrimitiveList(skill.sub_skills)
      .map(toId)
      .map(id => skills.get(id))
      .filter(Boolean)

    // Usar iconpath do Supabase convertido, com fallback para o caminho antigo
    const iconPath = convertIconPath(skill.iconpath) || `/assets/resources/textures/hero/skillicon/texture/SkillIcon_${skill.skillid}.png`

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
          {skillType && <p><strong>Tipo:</strong> {skillType}</p>}
          <p><strong>Cooldown:</strong> {cd}</p>
          {labels && <p><strong>Tags:</strong> {labels}</p>}
        </div>

        {mainDescription && (
          <div className="text-sm text-text-muted whitespace-pre-wrap mb-3"
            dangerouslySetInnerHTML={{ __html: mainDescription }} />
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
          const iconPath = convertIconPath(skill.iconpath) || `/assets/resources/textures/hero/skillicon/texture/SkillIcon_${skill.skillid}.png`
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