'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { translateKeys } from '@/lib/translate'
import {
  applySkillValues,
  loadSkillValues,
  setupGlobalSkillTooltips
} from '@/lib/applySkillValues'
import Link from 'next/link'

interface HeroBondsProps {
  heroId: number
}

interface SkillLine {
  condition?: string
  text: string
}

export default function HeroBonds({ heroId }: HeroBondsProps) {
  const { lang } = useLanguage()
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [relation, setRelation] = useState<any | null>(null)
  const [fetters, setFetters] = useState<any[]>([])
  const [combineSkills, setCombineSkills] = useState<any[]>([])
  const [combineStates, setCombineStates] = useState<any[]>([])
  const [combineSkillData, setCombineSkillData] = useState<Map<string, any>>(new Map())
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})
  const [labelMap, setLabelMap] = useState<Record<number, string>>({})
  const [attributeList, setAttributeList] = useState<string[]>([])

  // -------------------------------
  // Helpers
  // -------------------------------
  const safeParse = (v: any): any[] => {
    if (!v) return []
    try {
      if (typeof v === 'string') return JSON.parse(v)
      if (Array.isArray(v)) return v
      if (typeof v === 'object' && (v.des || v.value)) return [v]
    } catch {
      return []
    }
    return []
  }

  const getT = (key?: string) => translations[key || ''] || key || ''

  const renderHeroIcons = (ids: number[], size = 48) => (
    <div className="flex justify-center gap-2 mb-2">
      {ids.map((id) => {
        const img = `/assets/resources/textures/hero/circleherohead/CircleHeroHead_${id}0.png`
        return (
          <Link key={id} href={`/heroes/${id}`}>
            <img
              src={img}
              alt={`Hero ${id}`}
              className={`rounded-md border border-[var(--panel-border)] hover:scale-110 transition-transform`}
              style={{ width: size, height: size }}
            />
          </Link>
        )
      })}
    </div>
  )

  // -------------------------------
  // Data loading
  // -------------------------------
  useEffect(() => setupGlobalSkillTooltips(), [])

  useEffect(() => {
    const fetchRelations = async () => {
      const { data: rel } = await supabase
        .from('HeroRelationConfig')
        .select('*')
        .eq('id', heroId)
        .maybeSingle()

      if (!rel) return
      setRelation(rel)

      const tkeys = new Set<string>()
      const attrList = safeParse(rel.attribute_list)
      attrList.forEach((a) => tkeys.add(a))
      setAttributeList(attrList)

      // Fetters
      const bondIds = safeParse(rel.bond)
      const { data: frowsRaw } =
        bondIds.length > 0
          ? await supabase.from('HeroFettersConfig').select('*').in('id', bondIds)
          : { data: [] as any[] }
      const frows = frowsRaw ?? []
      frows.forEach((f) => {
        if (f?.name) tkeys.add(f.name)
        safeParse(f.attribute).forEach((a: any) => tkeys.add(a[0]))
      })

      // Combine skills / states
      const skillIdsRaw = [
        ...safeParse(rel.combine_skill_list),
        ...safeParse(rel.combine_state_list)
      ]
      const { data: combineRowsRaw } =
        skillIdsRaw.length > 0
          ? await supabase.from('HeroRelationSkillConfig').select('*').in('id', skillIdsRaw)
          : { data: [] as any[] }

      const combineRows = combineRowsRaw ?? []
      const combineSkillIds = safeParse(rel.combine_skill_list)
      const combineStateIds = safeParse(rel.combine_state_list)

      combineRows.forEach((r) => r?.name && tkeys.add(r.name))

      // Load skills and subs
      const skillIds = combineRows.map((r) => r.skill_id).filter(Boolean)
      const { data: skillRootsRaw } =
        skillIds.length > 0
          ? await supabase.from('SkillConfig').select('*').in('skillid', skillIds)
          : { data: [] as any[] }

      const roots = skillRootsRaw ?? []
      const subIds = roots.flatMap((r) => safeParse(r.sub_skills).map(String))
      const { data: subsRaw } =
        subIds.length > 0
          ? await supabase.from('SkillConfig').select('*').in('skillid', subIds)
          : { data: [] as any[] }

      const allSkills = [...roots, ...(subsRaw ?? [])]
      const map = new Map<string, any>()
      const usedValueIds = new Set<number>()
      const labelIds = new Set<number>()

      allSkills.forEach((s) => {
        map.set(String(s.skillid), s)
        if (s.name?.startsWith('LC_')) tkeys.add(s.name)
        if (s.skill_type) tkeys.add(`LC_SKILL_type_des_${s.skill_type}`)
        safeParse(s.label_list).forEach((l: any) => labelIds.add(Number(l)))
        for (const f of ['skill_des', 'skill_sketch', 'skill_condition']) {
          safeParse(s[f]).forEach((it: any) => {
            if (it?.des) tkeys.add(it.des)
            if (it?.condition) tkeys.add(it.condition)
            if (it?.value != null) usedValueIds.add(Number(it.value))
          })
        }
      })

      // 🔹 Labels — corrigido como no HeroSkillList
      let labelRecords: any[] = []
      if (labelIds.size > 0) {
        const { data: labels } = await supabase
          .from('SkillLabelConfig')
          .select('id, name')
          .in('id', Array.from(labelIds))
        labelRecords = labels || []
        labelRecords.forEach((l) => tkeys.add(l.name))
      }

      // 🔹 Traduções e valores
      const [tmap, vals] = await Promise.all([
        translateKeys(Array.from(tkeys), lang),
        loadSkillValues(Array.from(usedValueIds))
      ])

      // 🔹 Mapa de labels traduzido
      const lblMap: Record<number, string> = {}
      labelRecords.forEach((l) => (lblMap[l.id] = tmap[l.name] || l.name))

      setTranslations(tmap)
      setValuesMap(vals)
      setLabelMap(lblMap)
      setFetters(frows)
      setCombineSkills(combineRows.filter((r) => combineSkillIds.includes(r.id)))
      setCombineStates(combineRows.filter((r) => combineStateIds.includes(r.id)))
      setCombineSkillData(map)
    }

    fetchRelations()
  }, [heroId, lang])

  // -------------------------------
  // Render skill details
  // -------------------------------
  const renderSkillDetails = (skill: any): React.ReactElement => {
    const name = getT(skill.name)
    const cd = skill.cd === -1 ? '-' : skill.cd
    const skillType = getT(`LC_SKILL_type_des_${skill.skill_type}`)
    const labels = Array.isArray(skill.label_list)
      ? skill.label_list.map((id: number) => labelMap[id]).filter(Boolean).join(', ')
      : ''

    const desList = safeParse(skill.skill_des)
    const mainDescription =
      desList.length > 0 ? applySkillValues(getT(desList[0].des), desList[0].value, valuesMap) : ''

    const sketches = safeParse(skill.skill_sketch)
      .map((s: any) => applySkillValues(getT(s.des), s.value, valuesMap))
      .filter(Boolean)

    const conds = safeParse(skill.skill_condition).map((c: any) =>
      typeof c === 'string' ? c : c?.condition || ''
    )

    const sketchLines: SkillLine[] = sketches.map((text, i) => ({
      text,
      condition: conds[i] ? getT(conds[i]) : ''
    }))

    const subskills = safeParse(skill.sub_skills)
      .map((sid) => combineSkillData.get(String(sid)))
      .filter(Boolean)

    const iconPath = `/assets/resources/textures/hero/skillicon/texture/SkillIcon_${skill.skillid}.png`

    return (
      <div
        key={skill.skillid}
        className="mt-6 p-5 border rounded-xl shadow-lg backdrop-blur-md transition-all hover:shadow-xl"
        style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--panel-border)' }}
      >
        <div className="flex items-center gap-4 mb-3">
          <img src={iconPath} alt={name} className="w-20 h-20 object-contain" />
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

        {subskills.length > 0 && (
          <div className="mt-4 space-y-3">{subskills.map((sub) => renderSkillDetails(sub))}</div>
        )}
      </div>
    )
  }

  // -------------------------------
  // Render layout
  // -------------------------------
  if (!relation)
    return <p className="text-sm text-[var(--text-muted)]">No bond information found.</p>

  return (
    <section className="mt-6 space-y-6">
      {/* Attributes */}
      {attributeList.length > 0 && (
        <Panel title="Support Attributes">
          <ul className="text-sm space-y-1">
            {attributeList.map((a, i) => (
              <li key={i}>{getT(a)}</li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Combine Skills */}
      {combineSkills.length > 0 && (
        <Panel title="Combine Skills">
          {combineSkills.map((combo) => {
            const comboName = getT(combo.name)
            const heroes = safeParse(combo.hero_list)
            const skill = combineSkillData.get(String(combo.skill_id))
            return (
              <div
                key={combo.id}
                className="mb-8 border-b border-[var(--panel-border)] pb-4 last:border-0"
              >
                <p className="font-semibold text-lg mb-2">{comboName}</p>
                {renderHeroIcons(heroes, 80)}
                {skill && renderSkillDetails(skill)}
              </div>
            )
          })}
        </Panel>
      )}

      {/* Bonds + Passive Bonds */}
      {(fetters.length > 0 || combineStates.length > 0) && (
        <Panel title="Bonds">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...combineStates, ...fetters].map((entry, idx) => {
              const isState = !!entry.skill_id
              const name = getT(entry.name)
              const heroes = safeParse(isState ? entry.hero_list : entry.condition)
              const skill = isState ? combineSkillData.get(String(entry.skill_id)) : null
              const attrs = !isState ? safeParse(entry.attribute) : []
              const description = isState
                ? applySkillValues(
                    getT(safeParse(skill?.skill_des)[0]?.des),
                    safeParse(skill?.skill_des)[0]?.value,
                    valuesMap
                  )
                : ''
              return (
                <div
                  key={idx}
                  className="border border-[var(--panel-border)] rounded-lg p-3 hover:shadow-md transition-all"
                >
                  <p className="font-medium text-base mb-2 text-center">{name}</p>
                  {renderHeroIcons(heroes, 48)}
                  {isState ? (
                    <div
                      className="text-xs text-[var(--text-muted)] whitespace-pre-wrap text-center"
                      dangerouslySetInnerHTML={{ __html: description }}
                    />
                  ) : (
                    <ul className="text-xs text-[var(--text-muted)] space-y-1 text-center">
                      {attrs.map((a: any, i: number) => (
                        <li key={i}>
                          <strong>{getT(a[0])}</strong>: +{a[2]}%
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </Panel>
      )}
    </section>
  )
}

/* Reusable panel wrapper */
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="p-5 border rounded-xl shadow-md backdrop-blur-md"
      style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--panel-border)' }}
    >
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      {children}
    </div>
  )
}
