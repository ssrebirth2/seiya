'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { NO_DATA_LC_KEY, UI_KEYS } from '@/lib/i18n/ui-keys'
import { useLanguage } from '@/context/language-context'
import { loadSkillValues, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import {
  normalizeConditionList,
  normalizeDesValueList,
  parsePrimitiveList,
} from '@/lib/game/parse-game-data'
import { skillTypeLcKey } from '@/lib/game/format-skill-labels'
import {
  loadHeroProfileSkillEntries,
  loadHeroProfileSkillMap,
  type HeroProfileSkillEntry,
} from '@/lib/game/load-hero-profile-skills'
import { isAwakenSkillRow } from '@/lib/game/skill-ui-sprites'
import { buildSkillViewModel } from '@/lib/game/build-skill-view-model'
import { EmptyState, LoadingSkeleton } from '@/components/ui/v2'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { SkillDetailCard } from './SkillDetailCard'

interface HeroSkillListProps {
  heroId: number
  skillIds: (number | string)[]
}

type LabelRecord = { id: number; name: string }

export default function HeroSkillList({ heroId, skillIds }: HeroSkillListProps) {
  const { lang } = useLanguage()
  const { site, t } = useUiTranslation()
  const [skills, setSkills] = useState<Map<string, Record<string, unknown>>>(new Map())
  const [profileEntries, setProfileEntries] = useState<HeroProfileSkillEntry[]>([])
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})
  const [labelMap, setLabelMap] = useState<Record<number, string>>({})
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [isRetranslating, setIsRetranslating] = useState(false)

  const lcKeysRef = useRef<string[]>([])
  const labelRecordsRef = useRef<LabelRecord[]>([])

  const getT = createTranslationGetter(translations, { lang, pending: false })
  const noDataLabel = getT(NO_DATA_LC_KEY) || t(UI_KEYS.common.noData)

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
        for (const field of [
          'skill_des',
          'skill_sketch',
          'skill_star_des',
          'skill_sketch_short',
          'awaken_skill_des',
        ] as const) {
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

  const toViewModel = useCallback(
    (skill: Record<string, unknown>, preferAwakenSketch?: boolean) =>
      buildSkillViewModel({
        skill,
        getT,
        noDataLabel,
        valuesMap,
        labelMap,
        preferAwakenSketch,
      }),
    [getT, noDataLabel, valuesMap, labelMap]
  )

  const renderSkillCard = (
    skill: Record<string, unknown>,
    options?: { preferAwakenSketch?: boolean; nested?: boolean }
  ): React.ReactElement => {
    const model = toViewModel(skill, options?.preferAwakenSketch)
    const subskills = model.subskillIds
      .map((id) => skills.get(id))
      .filter(Boolean) as Record<string, unknown>[]

    return (
      <SkillDetailCard
        key={`skill-${model.skillId}${options?.nested ? '-nested' : ''}`}
        skill={skill}
        name={model.name}
        iconPath={model.iconPath}
        skillTypeLabel={model.skillTypeLabel}
        tagLabels={model.tagLabels}
        mainDescriptionHtml={model.mainDescriptionHtml}
        levelLines={model.levelLines}
        noDataLabel={noDataLabel}
        getT={getT}
        nested={Boolean(options?.nested)}
        density="compact"
        subskills={
          subskills.length > 0
            ? subskills.map((sub) =>
                renderSkillCard(sub, {
                  preferAwakenSketch: options?.preferAwakenSketch,
                  nested: true,
                })
              )
            : undefined
        }
      />
    )
  }

  if (!profileEntries.length && !skillIds.length) return null

  if (isDataLoading && !skills.size) {
    return (
      <section className="skill-profile-section">
        <LoadingSkeleton variant="detail" />
      </section>
    )
  }

  if (!profileEntries.length) {
    return (
      <section className="skill-profile-section">
        <EmptyState message={site('noSkills')} />
      </section>
    )
  }

  const baseEntries = profileEntries.filter((e) => !e.isQuality && !e.isAwaken)
  const qualityEntries = profileEntries.filter((e) => e.isQuality)
  const awakenEntries = profileEntries.filter((e) => e.isAwaken)

  const renderEntryList = (entries: HeroProfileSkillEntry[]) => (
    <ul className="skill-detail-list">
      {entries.map((entry) => {
        const skill = skills.get(entry.skillId)
        if (!skill) return null
        const preferAwaken = entry.isAwaken || isAwakenSkillRow(skill)

        return (
          <li key={`profile-skill-${entry.skillId}`} className="skill-detail-list__item">
            {renderSkillCard(skill, { preferAwakenSketch: preferAwaken })}
          </li>
        )
      })}
    </ul>
  )

  return (
    <section
      className={`skill-profile-section${isRetranslating ? ' i18n-content--pending' : ''}`}
    >
      {baseEntries.length > 0 ? renderEntryList(baseEntries) : null}

      {qualityEntries.length > 0 ? (
        <div className="skill-profile-group">
          <h3 className="skill-profile-group__title">{t(UI_KEYS.hero.qualitySkillTab)}</h3>
          {renderEntryList(qualityEntries)}
        </div>
      ) : null}

      {awakenEntries.length > 0 ? (
        <div className="skill-profile-group">
          <h3 className="skill-profile-group__title">{t(UI_KEYS.hero.awakenTab)}</h3>
          {renderEntryList(awakenEntries)}
        </div>
      ) : null}
    </section>
  )
}
