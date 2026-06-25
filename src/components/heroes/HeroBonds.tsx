'use client'

import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import {
  applySkillValues,
  loadSkillValues,
  setupGlobalSkillTooltips,
} from '@/lib/game/apply-skill-values'
import {
  normalizeConditionList,
  normalizeDesValueList,
  parsePrimitiveList,
} from '@/lib/game/parse-game-data'
import {
  resolveSkillTypeLabel,
  skillTypeLcKey,
  isNotAvailableLabel,
} from '@/lib/game/format-skill-labels'
import { resolveSkillIconUrl } from '@/lib/game/resolve-skill-icon'
import { NO_DATA_LC_KEY, UI_KEYS } from '@/lib/i18n/ui-keys'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'
import Link from 'next/link'
import GameImage from '@/components/ui/GameImage'
import { circleHeroHeadUrl } from '@/lib/assets/game-images'
import { useHeroHeadIconMap } from '@/hooks/use-hero-head-icons'
import { useLocalizedHref } from '@/lib/i18n/localized-href'
import { SkillDetailCard, type SkillDetailLine } from './SkillDetailCard'
import { HeroBondsSection } from './bonds/HeroBondsSection'
import { HeroBondsComboCard, type ComboParticipation } from './bonds/HeroBondsComboCard'
import { HeroBondsBondCard } from './bonds/HeroBondsBondCard'
import {
  fetchPartnerComboSkillsForHero,
  parseHeroRelationHeroIds,
  type HeroRelationComboRow,
} from '@/lib/game/hero-relation-combos'

interface HeroBondsProps {
  heroId: number
}

type ComboDisplay = {
  row: HeroRelationComboRow
  participation: ComboParticipation
  launcherId: number
  partnerIds: number[]
}

function safeParse(v: unknown): unknown[] {
  if (!v) return []
  try {
    if (typeof v === 'string') return JSON.parse(v)
    if (Array.isArray(v)) return v
    if (typeof v === 'object' && v !== null && ('des' in v || 'value' in v)) return [v]
  } catch {
    return []
  }
  return []
}

function collectSkillTranslationKeys(
  skills: Record<string, unknown>[],
  tkeys: Set<string>,
  usedValueIds: Set<number>,
  labelIds: Set<number>
) {
  for (const s of skills) {
    if (typeof s.name === 'string' && s.name.startsWith('LC_')) tkeys.add(s.name)
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
  }
}

export default function HeroBonds({ heroId }: HeroBondsProps) {
  const { lang } = useLanguage()
  const { t } = useUiTranslation()
  const { data: iconMap } = useHeroHeadIconMap()
  const localized = useLocalizedHref()
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [relation, setRelation] = useState<Record<string, unknown> | null>(null)
  const [fetters, setFetters] = useState<Record<string, unknown>[]>([])
  const [comboDisplays, setComboDisplays] = useState<ComboDisplay[]>([])
  const [combineStates, setCombineStates] = useState<HeroRelationComboRow[]>([])
  const [combineSkillData, setCombineSkillData] = useState<Map<string, Record<string, unknown>>>(
    new Map()
  )
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})
  const [labelMap, setLabelMap] = useState<Record<number, string>>({})
  const [attributeList, setAttributeList] = useState<string[]>([])
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [isRetranslating, setIsRetranslating] = useState(false)

  const lcKeysRef = useRef<string[]>([])
  const labelRecordsRef = useRef<{ id: number; name: string }[]>([])

  const getT = createTranslationGetter(translations, { lang })
  const noDataLabel = getT(NO_DATA_LC_KEY)

  const renderBondPortraits = (ids: number[]) => (
    <div className="hero-bonds-portraits hero-bonds-portraits--sm">
      {ids.map((id) => (
        <Link
          key={id}
          href={localized(`/heroes/${id}`)}
          className="hero-bonds-portrait hero-bonds-portrait--bond"
          title={`Hero ${id}`}
        >
          <GameImage
            src={circleHeroHeadUrl(id, iconMap)}
            alt=""
            aria-hidden
            className="hero-bonds-portrait__img"
            rawSrc={circleHeroHeadUrl(id, iconMap)}
          />
        </Link>
      ))}
    </div>
  )

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

      const tkeys = new Set<string>()
      tkeys.add(UI_KEYS.common.heroLv)
      tkeys.add(UI_KEYS.hero.comboRoleCaster)
      tkeys.add(UI_KEYS.hero.comboRolePartner)
      tkeys.add(UI_KEYS.hero.comboPartnerHint)

      setRelation(rel)

      const attrList = rel
        ? safeParse(rel.attribute_list).filter((a): a is string => typeof a === 'string')
        : []
      attrList.forEach((a) => tkeys.add(a))
      setAttributeList(attrList)

      const bondIds = rel ? parseHeroRelationHeroIds(rel.bond) : []
      const { data: frowsRaw } =
        bondIds.length > 0
          ? await supabase.from('HeroFettersConfig').select('*').in('id', bondIds)
          : { data: [] as Record<string, unknown>[] }
      const frows = frowsRaw ?? []
      frows.forEach((f) => {
        if (typeof f?.name === 'string') tkeys.add(f.name)
        safeParse(f.attribute).forEach((a) => {
          if (Array.isArray(a) && typeof a[0] === 'string') tkeys.add(a[0])
        })
      })

      const ownedComboIds = rel ? parseHeroRelationHeroIds(rel.combine_skill_list) : []
      const combineStateIds = rel ? parseHeroRelationHeroIds(rel.combine_state_list) : []

      const partnerRows = await fetchPartnerComboSkillsForHero(heroId)

      const partnerIds = partnerRows.map((row) => row.id)
      const allComboConfigIds = [...new Set([...ownedComboIds, ...partnerIds])]

      const skillIdsRaw = [...allComboConfigIds, ...combineStateIds]
      const { data: combineRowsRaw } =
        skillIdsRaw.length > 0
          ? await supabase.from('HeroRelationSkillConfig').select('*').in('id', skillIdsRaw)
          : { data: [] as HeroRelationComboRow[] }

      const combineRows = combineRowsRaw ?? []
      combineRows.forEach((r) => {
        if (typeof r?.name === 'string') tkeys.add(r.name)
      })

      const ownedSet = new Set(ownedComboIds)
      const displays: ComboDisplay[] = []

      for (const id of ownedComboIds) {
        const row = combineRows.find((r) => r.id === id)
        if (!row) continue
        displays.push({
          row,
          participation: 'caster',
          launcherId: Number(row.hero_id) || heroId,
          partnerIds: parseHeroRelationHeroIds(row.hero_list),
        })
      }

      for (const row of partnerRows) {
        if (ownedSet.has(row.id)) continue
        displays.push({
          row,
          participation: 'partner',
          launcherId: Number(row.hero_id),
          partnerIds: parseHeroRelationHeroIds(row.hero_list),
        })
      }

      const skillIds = combineRows.map((r) => r.skill_id).filter(Boolean) as number[]
      const { data: skillRootsRaw } =
        skillIds.length > 0
          ? await supabase.from('SkillConfig').select('*').in('skillid', skillIds)
          : { data: [] as Record<string, unknown>[] }

      const roots = skillRootsRaw ?? []
      const subIds = roots.flatMap((r) => parsePrimitiveList(r.sub_skills).map(String))
      const { data: subsRaw } =
        subIds.length > 0
          ? await supabase.from('SkillConfig').select('*').in('skillid', subIds)
          : { data: [] as Record<string, unknown>[] }

      const allSkills = [...roots, ...(subsRaw ?? [])]
      const map = new Map<string, Record<string, unknown>>()
      const usedValueIds = new Set<number>()
      const labelIds = new Set<number>()

      collectSkillTranslationKeys(allSkills, tkeys, usedValueIds, labelIds)

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

      allSkills.forEach((s) => map.set(String(s.skillid), s))

      lcKeysRef.current = Array.from(tkeys)
      labelRecordsRef.current = labelRecords

      setValuesMap(vals)
      setFetters(frows)
      setComboDisplays(displays)
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

  if (isDataLoading) {
    return (
      <section className="hero-bonds-root hero-bonds-root--loading">
        <div className="spinner h-8 w-8" />
      </section>
    )
  }

  const hasBondContent =
    attributeList.length > 0 ||
    comboDisplays.length > 0 ||
    fetters.length > 0 ||
    combineStates.length > 0

  if (!relation && !hasBondContent) {
    return <p className="hero-bonds-empty">{t(UI_KEYS.common.noData)}</p>
  }

  const casterLabel = getT(UI_KEYS.hero.comboRoleCaster)
  const partnerLabel = getT(UI_KEYS.hero.comboRolePartner)
  const partnerHint = getT(UI_KEYS.hero.comboPartnerHint)

  return (
    <section className={`hero-bonds-root${isRetranslating ? ' i18n-content--pending' : ''}`}>
      {attributeList.length > 0 ? (
        <HeroBondsSection title={t(UI_KEYS.hero.supportAttributes)}>
          <ul className="hero-bonds-stat-chips">
            {attributeList.map((a, i) => (
              <li key={i} className="hero-bonds-stat-chip">
                {getT(a)}
              </li>
            ))}
          </ul>
        </HeroBondsSection>
      ) : null}

      {comboDisplays.length > 0 ? (
        <HeroBondsSection title={t(UI_KEYS.hero.combineSkills)}>
          <div className="hero-bonds-combo-list">
            {comboDisplays.map(({ row, participation, launcherId, partnerIds }) => {
              const skill = combineSkillData.get(String(row.skill_id))
              return (
                <HeroBondsComboCard
                  key={row.id}
                  comboName={getT(String(row.name ?? ''))}
                  launcherId={launcherId}
                  partnerIds={partnerIds}
                  profileHeroId={heroId}
                  participation={participation}
                  partnerHint={partnerHint}
                  casterLabel={casterLabel}
                  partnerLabel={partnerLabel}
                  iconMap={iconMap}
                  localized={localized}
                  skillPanel={
                    skill ? (
                      <div className="skill-detail-panel">{renderSkillDetails(skill)}</div>
                    ) : null
                  }
                />
              )
            })}
          </div>
        </HeroBondsSection>
      ) : null}

      {combineStates.length > 0 ? (
        <HeroBondsSection title={t(UI_KEYS.hero.bondSkills)}>
          <div className="hero-bonds-grid hero-bonds-grid--skills">
            {combineStates.map((entry, idx) => {
              const name = getT(String(entry.name ?? ''))
              const heroes = parseHeroRelationHeroIds(entry.hero_list)
              const skill = combineSkillData.get(String(entry.skill_id))
              const skillDes = normalizeDesValueList(skill?.skill_des)
              const description = applySkillValues(
                getT(skillDes[0]?.des),
                skillDes[0]?.value ?? 0,
                valuesMap
              )

              return (
                <HeroBondsBondCard
                  key={`state-${entry.id ?? idx}`}
                  name={name}
                  portraits={renderBondPortraits(heroes)}
                  variant="state"
                >
                  <div
                    className="hero-bonds-bond__desc"
                    dangerouslySetInnerHTML={{ __html: description }}
                  />
                </HeroBondsBondCard>
              )
            })}
          </div>
        </HeroBondsSection>
      ) : null}

      {fetters.length > 0 ? (
        <HeroBondsSection>
          <div className="hero-bonds-grid hero-bonds-grid--stats">
            {fetters.map((entry, idx) => {
              const name = getT(String(entry.name ?? ''))
              const heroes = parseHeroRelationHeroIds(entry.condition)
              const attrs = safeParse(entry.attribute)

              return (
                <HeroBondsBondCard
                  key={`fetter-${entry.id ?? idx}`}
                  name={name}
                  portraits={renderBondPortraits(heroes)}
                  variant="fetter"
                >
                  <ul className="hero-bonds-bond__attrs">
                    {attrs.map((a, i) => {
                      if (!Array.isArray(a)) return null
                      return (
                        <li key={i} className="hero-bonds-bond__attr">
                          <span className="hero-bonds-bond__attr-label">{getT(String(a[0]))}</span>
                          <span className="hero-bonds-bond__attr-value">+{a[2]}%</span>
                        </li>
                      )
                    })}
                  </ul>
                </HeroBondsBondCard>
              )
            })}
          </div>
        </HeroBondsSection>
      ) : null}
    </section>
  )
}
