'use client'



import React, { useEffect, useRef, useState } from 'react'

import { supabase } from '@/lib/supabase-client'

import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'

import { NO_DATA_LC_KEY, UI_KEYS } from '@/lib/i18n/ui-keys'

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

import {

  loadHeroProfileSkillEntries,

  loadHeroProfileSkillMap,

  type HeroProfileSkillEntry,

} from '@/lib/game/load-hero-profile-skills'

import { isAwakenSkillRow } from '@/lib/game/skill-ui-sprites'

import { SkillDetailCard, type SkillDetailLine } from './SkillDetailCard'

import { SkillIconButton } from './SkillIconButton'



interface HeroSkillListProps {

  heroId: number

  skillIds: (number | string)[]

}



type LabelRecord = { id: number; name: string }



export default function HeroSkillList({ heroId, skillIds }: HeroSkillListProps) {

  const { lang } = useLanguage()

  const [skills, setSkills] = useState<Map<string, Record<string, unknown>>>(new Map())

  const [profileEntries, setProfileEntries] = useState<HeroProfileSkillEntry[]>([])

  const [translations, setTranslations] = useState<Record<string, string>>({})

  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})

  const [labelMap, setLabelMap] = useState<Record<number, string>>({})

  const [activeSkillId, setActiveSkillId] = useState<string | null>(null)

  const [isDataLoading, setIsDataLoading] = useState(true)

  const [isRetranslating, setIsRetranslating] = useState(false)



  const lcKeysRef = useRef<string[]>([])

  const labelRecordsRef = useRef<LabelRecord[]>([])



  const toId = (v: unknown) => String(v)

  const getT = createTranslationGetter(translations, { lang })

  const noDataLabel = getT(NO_DATA_LC_KEY)



  useEffect(() => {

    setupGlobalSkillTooltips()

  }, [])



  useEffect(() => {

    let cancelled = false

    setIsDataLoading(true)



    const loadData = async () => {

      const entries = await loadHeroProfileSkillEntries(heroId, skillIds)

      const map = await loadHeroProfileSkillMap(entries)

      if (cancelled) return



      if (!map.size) {

        setProfileEntries(entries)

        setSkills(new Map())

        lcKeysRef.current = []

        labelRecordsRef.current = []

        setIsDataLoading(false)

        return

      }



      const usedValueIds = new Set<number>()

      map.forEach((skill) => {

        for (const field of ['skill_des', 'skill_sketch', 'skill_star_des', 'skill_sketch_short', 'awaken_skill_des'] as const) {

          normalizeDesValueList(skill[field]).forEach((it) => {

            if (it.value != null) usedValueIds.add(Number(it.value))

          })

        }

      })



      const translationKeys = new Set<string>()

      const labelIds = new Set<number>()



      map.forEach((s) => {

        if (typeof s.name === 'string' && s.name.startsWith('LC_')) translationKeys.add(s.name)

        const typeKey = skillTypeLcKey(s.skill_type)

        if (typeKey) translationKeys.add(typeKey)

        translationKeys.add(UI_KEYS.common.heroLv)

        translationKeys.add(UI_KEYS.common.dataSeconds)

        parsePrimitiveList(s.label_list).forEach((l) => labelIds.add(Number(l)))



        for (const f of ['skill_des', 'skill_sketch', 'awaken_skill_des'] as const) {

          normalizeDesValueList(s[f]).forEach((it) => {

            if (it.des) translationKeys.add(it.des)

          })

        }

        normalizeConditionList(s.skill_condition).forEach((c) => translationKeys.add(c))

      })



      let labelRecords: LabelRecord[] = []

      if (labelIds.size > 0) {

        const { data: labels } = await supabase

          .from('SkillLabelConfig')

          .select('id, name')

          .in('id', Array.from(labelIds))

        labelRecords = labels || []

        labelRecords.forEach((l) => translationKeys.add(l.name))

      }



      if (cancelled) return



      const valueMap = await loadSkillValues(Array.from(usedValueIds))

      if (cancelled) return



      lcKeysRef.current = Array.from(translationKeys)

      labelRecordsRef.current = labelRecords



      setProfileEntries(entries)

      setSkills(map)

      setValuesMap(valueMap)

      setIsDataLoading(false)



      setActiveSkillId((prev) => {

        if (prev && entries.some((e) => e.skillId === prev)) return prev

        return entries[0]?.skillId ?? null

      })

    }



    loadData()

    return () => {

      cancelled = true

    }

  }, [heroId, skillIds])



  useEffect(() => {

    if (isDataLoading || !lcKeysRef.current.length) return



    let cancelled = false

    setIsRetranslating(true)



    const retranslate = async () => {

      const translated = await translateKeys(lcKeysRef.current, lang)

      if (cancelled) return



      const lblMap: Record<number, string> = {}

      const resolveNoData = createTranslationGetter(translated, { lang })

      labelRecordsRef.current.forEach(

        (l) => (lblMap[l.id] = translated[l.name] || resolveNoData(NO_DATA_LC_KEY))

      )



      setTranslations(translated)

      setLabelMap(lblMap)

      setIsRetranslating(false)

    }



    retranslate()

    return () => {

      cancelled = true

    }

  }, [lang, isDataLoading])



  const renderSkillDetails = (

    skill: Record<string, unknown>,

    options?: { preferAwakenSketch?: boolean; nested?: boolean }

  ): React.ReactElement => {

    const name = getT(String(skill.name ?? ''))

    const skillType = resolveSkillTypeLabel(skill.skill_type, getT)

    const tagLabels = parsePrimitiveList(skill.label_list)

      .map((id) => labelMap[Number(id)])

      .filter((label) => label && !isNotAvailableLabel(label))



    const desList = normalizeDesValueList(skill.skill_des)

    const mainDescription = desList.length > 0

      ? (() => {

          const raw = getT(desList[0].des)

          if (isNotAvailableLabel(raw, noDataLabel)) return `<p class="italic">${noDataLabel}</p>`

          return applySkillValues(raw, desList[0].value ?? 0, valuesMap)

        })()

      : ''



    const sketchField = options?.preferAwakenSketch ? 'awaken_skill_des' : 'skill_sketch'

    const sketches = normalizeDesValueList(skill[sketchField])

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

      .map(toId)

      .map((id) => skills.get(id))

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

            ? subskills.map((sub) =>

                renderSkillDetails(sub, { ...options, nested: true })

              )

            : undefined

        }

      />

    )

  }



  const activeEntry = profileEntries.find((e) => e.skillId === activeSkillId)

  const activeSkill = activeSkillId ? skills.get(activeSkillId) : undefined



  if (!profileEntries.length && !skillIds.length) return null



  const showInitialSpinner = isDataLoading && !skills.size



  if (showInitialSpinner) {

    return (

      <section className="mt-2 flex justify-center py-8 sm:mt-4">

        <div className="spinner h-8 w-8" />

      </section>

    )

  }



  return (

    <section

      className={`skill-profile-section mt-2 sm:mt-4${isRetranslating ? ' i18n-content--pending' : ''}`}

    >

      <div className="skill-icon-row-wrap">

        <div className="skill-icon-row">

          <div className="skill-icon-row__track">

        {profileEntries.map((entry) => {

          const skill = skills.get(entry.skillId)

          if (!skill) return null

          const name = getT(String(skill.name ?? ''))

          const isActive = activeSkillId === entry.skillId



          return (

            <SkillIconButton

              key={`profile-skill-${entry.skillId}`}

              skill={skill}

              name={name}

              selected={isActive}

              onClick={() => setActiveSkillId(entry.skillId)}

            />

          )

        })}

          </div>

        </div>

      </div>



      {activeSkill && (

        <div className="skill-detail-panel">

          {renderSkillDetails(activeSkill, {

            preferAwakenSketch: activeEntry?.isAwaken || isAwakenSkillRow(activeSkill),

          })}

        </div>

      )}

    </section>

  )

}


