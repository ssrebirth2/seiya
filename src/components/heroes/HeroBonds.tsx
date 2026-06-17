'use client'

import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import {
  applySkillValues,
  loadSkillValues,
  setupGlobalSkillTooltips
} from '@/lib/game/apply-skill-values'
import {
  normalizeConditionList,
  normalizeDesValueList,
  parsePrimitiveList,
} from '@/lib/game/parse-game-data'
import { resolveSkillTypeLabel, skillTypeLcKey, isNotAvailableLabel } from '@/lib/game/format-skill-labels'
import { resolveSkillIconUrl } from '@/lib/game/resolve-skill-icon'
import { NO_DATA_LC_KEY, UI_KEYS } from '@/lib/i18n/ui-keys'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'
import Link from 'next/link'
import GameImage from '@/components/ui/GameImage'
import { circleHeroHeadUrl } from '@/lib/assets/game-images'
import { useHeroHeadIconMap } from '@/hooks/use-hero-head-icons'
import { SkillDetailCard, type SkillDetailLine } from './SkillDetailCard'

interface HeroBondsProps {
  heroId: number
}

export default function HeroBonds({ heroId }: HeroBondsProps) {
  const { lang } = useLanguage()
  const { t } = useUiTranslation()
  const { data: iconMap } = useHeroHeadIconMap()
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [relation, setRelation] = useState<any | null>(null)
  const [fetters, setFetters] = useState<any[]>([])
  const [combineSkills, setCombineSkills] = useState<any[]>([])
  const [combineStates, setCombineStates] = useState<any[]>([])
  const [combineSkillData, setCombineSkillData] = useState<Map<string, any>>(new Map())
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})
  const [labelMap, setLabelMap] = useState<Record<number, string>>({})
  const [attributeList, setAttributeList] = useState<string[]>([])
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [isRetranslating, setIsRetranslating] = useState(false)

  const lcKeysRef = useRef<string[]>([])
  const labelRecordsRef = useRef<{ id: number; name: string }[]>([])
  const usedValueIdsRef = useRef<number[]>([])

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

  const getT = createTranslationGetter(translations, { lang })
  const noDataLabel = getT(NO_DATA_LC_KEY)

  const renderHeroIcons = (ids: number[], size = 48) => (
    <div className="flex justify-center gap-2 mb-2">
      {ids.map((id) => (
          <Link key={id} href={`/heroes/${id}`}>
            <GameImage
              src={circleHeroHeadUrl(id, iconMap)}
              alt={`Hero ${id}`}
              className="rounded-md border border-panel-border hover:scale-110 transition-transform bg-panel-hover object-cover"
              style={{ width: size, height: size }}
            />
          </Link>
        ))}
    </div>
  )

  // -------------------------------
  // Data loading
  // -------------------------------
  useEffect(() => setupGlobalSkillTooltips(), [])

  useEffect(() => {
    let cancelled = false
    setIsDataLoading(true)

    const fetchRelations = async () => {
      const { data: rel } = await supabase
        .from('HeroRelationConfig')
        .select('*')
        .eq('id', heroId)
        .maybeSingle()

      if (cancelled) return
      if (!rel) {
        setRelation(null)
        lcKeysRef.current = []
        setIsDataLoading(false)
        return
      }
      setRelation(rel)

      const tkeys = new Set<string>()
      tkeys.add(UI_KEYS.common.heroLv)
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
      const subIds = roots.flatMap((r) => parsePrimitiveList(r.sub_skills).map(String))
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
        if (s.skill_type) {
          const typeKey = skillTypeLcKey(s.skill_type)
          if (typeKey) tkeys.add(typeKey)
        }
        parsePrimitiveList(s.label_list).forEach((l) => labelIds.add(Number(l)))
        for (const f of ['skill_des', 'skill_sketch'] as const) {
          normalizeDesValueList(s[f]).forEach((it) => {
            if (it.des) tkeys.add(it.des)
            if (it.value != null) usedValueIds.add(Number(it.value))
          })
        }
        normalizeConditionList(s.skill_condition).forEach((c) => tkeys.add(c))
      })

      // Labels
      let labelRecords: { id: number; name: string }[] = []
      if (labelIds.size > 0) {
        const { data: labels } = await supabase
          .from('SkillLabelConfig')
          .select('id, name')
          .in('id', Array.from(labelIds))
        labelRecords = labels || []
        labelRecords.forEach((l) => tkeys.add(l.name))
      }

      if (cancelled) return

      const vals = await loadSkillValues(Array.from(usedValueIds))

      if (cancelled) return

      lcKeysRef.current = Array.from(tkeys)
      labelRecordsRef.current = labelRecords
      usedValueIdsRef.current = Array.from(usedValueIds)

      setValuesMap(vals)
      setFetters(frows)
      setCombineSkills(combineRows.filter((r) => combineSkillIds.includes(r.id)))
      setCombineStates(combineRows.filter((r) => combineStateIds.includes(r.id)))
      setCombineSkillData(map)
      setIsDataLoading(false)
    }

    fetchRelations()
    return () => {
      cancelled = true
    }
  }, [heroId])

  useEffect(() => {
    if (isDataLoading || !lcKeysRef.current.length) return

    let cancelled = false
    setIsRetranslating(true)

    const retranslate = async () => {
      const tmap = await translateKeys(lcKeysRef.current, lang)
      if (cancelled) return

      const lblMap: Record<number, string> = {}
      labelRecordsRef.current.forEach((l) => (lblMap[l.id] = tmap[l.name] || l.name))

      setTranslations(tmap)
      setLabelMap(lblMap)
      setIsRetranslating(false)
    }

    retranslate()
    return () => {
      cancelled = true
    }
  }, [lang, isDataLoading])

  // -------------------------------
  // Render skill details
  // -------------------------------
  const renderSkillDetails = (
    skill: Record<string, unknown>,
    options?: { nested?: boolean }
  ): React.ReactElement => {
    const name = getT(String(skill.name ?? ''))
    const skillType = resolveSkillTypeLabel(skill.skill_type, getT)
    const tagLabels = parsePrimitiveList(skill.label_list)
      .map((id) => labelMap[Number(id)])
      .filter((label) => label && !isNotAvailableLabel(label, noDataLabel))

    const desList = normalizeDesValueList(skill.skill_des)
    const mainDescription =
      desList.length > 0
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
    const levelLines: SkillDetailLine[] = sketchTexts
      .map((text, i) => ({
        level: i + 1,
        text,
        condition: conds[i] ? getT(conds[i]) : '',
      }))
      .filter((line) => line.text || line.condition)

    const subskills = parsePrimitiveList(skill.sub_skills)
      .map((sid) => combineSkillData.get(String(sid)))
      .filter(Boolean) as Record<string, unknown>[]

    const iconPath = resolveSkillIconUrl(skill as { iconpath?: string | null }) ?? ''

    return (
      <SkillDetailCard
        key={`skill-${skill.skillid}`}
        skill={skill}
        name={name}
        iconPath={iconPath}
        skillTypeLabel={skillType}
        tagLabels={tagLabels}
        mainDescriptionHtml={mainDescription}
        levelLines={levelLines}
        noDataLabel={noDataLabel}
        getT={getT}
        nested={Boolean(options?.nested)}
        subskills={
          subskills.length > 0
            ? subskills.map((sub) => renderSkillDetails(sub, { nested: true }))
            : undefined
        }
      />
    )
  }

  // -------------------------------
  // Render layout
  // -------------------------------
  if (isDataLoading) {
    return (
      <section className="mt-2 flex justify-center py-8 sm:mt-4">
        <div className="spinner h-8 w-8" />
      </section>
    )
  }

  if (!relation)
    return <p className="text-sm text-text-muted">No bond information found.</p>

  return (
    <section className={`mt-6 space-y-6${isRetranslating ? ' i18n-content--pending' : ''}`}>
      {attributeList.length > 0 && (
        <Panel title={t(UI_KEYS.hero.supportAttributes)}>
          <ul className="text-sm space-y-1">
            {attributeList.map((a, i) => (
              <li key={i}>{getT(a)}</li>
            ))}
          </ul>
        </Panel>
      )}

      {combineSkills.length > 0 && (
        <Panel title={t(UI_KEYS.hero.combineSkills)}>
          {combineSkills.map((combo) => {
            const comboName = getT(combo.name)
            const heroes = safeParse(combo.hero_list)
            const skill = combineSkillData.get(String(combo.skill_id))
            return (
              <div
                key={combo.id}
                className="mb-8 border-b border-panel-border pb-4 last:border-0"
              >
                <p className="font-semibold text-lg mb-2">{comboName}</p>
                {renderHeroIcons(heroes, 80)}
                {skill ? (
                  <div className="mt-4">{renderSkillDetails(skill)}</div>
                ) : null}
              </div>
            )
          })}
        </Panel>
      )}

      {(fetters.length > 0 || combineStates.length > 0) && (
        <Panel title={t(UI_KEYS.hero.bondSkills)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...combineStates, ...fetters].map((entry, idx) => {
              const isState = !!entry.skill_id
              const name = getT(entry.name)
              const heroes = safeParse(isState ? entry.hero_list : entry.condition)
              const skill = isState ? combineSkillData.get(String(entry.skill_id)) : null
              const attrs = !isState ? safeParse(entry.attribute) : []
              const skillDes = normalizeDesValueList(skill?.skill_des)
              const description = isState
                ? applySkillValues(
                    getT(skillDes[0]?.des),
                    skillDes[0]?.value ?? 0,
                    valuesMap
                  )
                : ''
              return (
                <div
                  key={idx}
                  className="border border-panel-border rounded-lg p-3 hover:shadow-md transition-all"
                >
                  <p className="font-medium text-base mb-2 text-center">{name}</p>
                  {renderHeroIcons(heroes, 48)}
                  {isState ? (
                    <div
                      className="text-xs text-text-muted whitespace-pre-wrap text-center"
                      dangerouslySetInnerHTML={{ __html: description }}
                    />
                  ) : (
                    <ul className="text-xs text-text-muted space-y-1 text-center">
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-panel-border bg-panel p-5 shadow-md backdrop-blur-md">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      {children}
    </div>
  )
}
