'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys } from '@/lib/i18n/language-package'
import {
  applySkillValues,
  loadSkillValues,
  setupGlobalSkillTooltips,
} from '@/lib/game/apply-skill-values'
import { normalizeDesValueList, normalizeSkillRefList } from '@/lib/game/parse-game-data'
import { ForceCardMaterialPanel } from '@/components/force-cards/ForceCardMaterialPanel'
import { ForceCardSkillTableHeader } from '@/components/force-cards/ForceCardSkillTableHeader'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { getAwakenStarIconPath, getStarIconPath } from '@/lib/game/hero-ui-sprites'
import GameImage from '@/components/ui/GameImage'

type Props = {
  starUps: any[]
  awakens?: any[]
  cardQuality?: number
}

type SkillConfig = {
  skillid: number | string
  name?: string
  skill_des?: unknown
  skill_sketch?: unknown
}

type ProgressionRow = {
  id: number
  item_id?: number
  skill_up?: unknown
  consume?: unknown
  decompose_return?: unknown
  consume_currency?: unknown
}

type StarVariant = 'normal' | 'awaken'

/** Game SkillInfoItem: text level + one star icon; awaken rows use index - 7 for display. */
function getStarDisplayLevel(rawSkillLv: number, variant: StarVariant): number {
  if (rawSkillLv <= 0) return 0
  if (variant === 'awaken' && rawSkillLv > 7) return rawSkillLv - 7
  return rawSkillLv
}

function StarLevelDisplay({ displayLevel, variant }: { displayLevel: number; variant: StarVariant }) {
  if (displayLevel <= 0) return <span className="force-card-material-empty">—</span>

  const iconSrc = variant === 'awaken' ? getAwakenStarIconPath() : getStarIconPath()

  return (
    <span className="force-card-progression__stars">
      <span className="force-card-progression__star-level" aria-hidden>
        {displayLevel}
      </span>
      <GameImage
        src={iconSrc}
        rawSrc={iconSrc}
        alt=""
        aria-hidden
        className="force-card-progression__star-icon"
      />
    </span>
  )
}

function ProgressionSkillRow({
  row,
  starVariant,
  cardQuality = 1,
  skillsById,
  renderSkillEffect,
}: {
  row: ProgressionRow
  starVariant: StarVariant
  cardQuality?: number
  skillsById: Map<string, SkillConfig>
  renderSkillEffect: (skill: SkillConfig | undefined, lv: number) => ReactNode
}) {
  const { t } = useUiTranslation()
  const skillData = normalizeSkillRefList(row.skill_up)
  const skill = skillsById.get(String(skillData[0]?.skill_id))
  const skillLv = Number(skillData[0]?.skill_lv ?? 0)
  const displayLevel = getStarDisplayLevel(skillLv, starVariant)
  const cardId = row.item_id ?? (row.id > 10 ? Math.floor(row.id / 10) : undefined)

  return (
    <tr>
      <td data-label={t(UI_KEYS.common.grade)}>
        <StarLevelDisplay displayLevel={displayLevel} variant={starVariant} />
      </td>
      <td data-label={t(UI_KEYS.forceCard.effect)}>
        <div className="force-card-progression-effect">{renderSkillEffect(skill, skillLv)}</div>
      </td>
      <td data-label={t(UI_KEYS.common.consume)}>
        <ForceCardMaterialPanel
          cardId={cardId}
          cardQuality={cardQuality}
          configId={row.id}
          consume={row.consume}
          consumeCurrency={row.consume_currency}
          sections="consume"
          showSectionLabels={false}
          layout="inline"
        />
      </td>
      <td data-label={t(UI_KEYS.forceCard.recycleGain)}>
        <ForceCardMaterialPanel
          cardId={cardId}
          cardQuality={cardQuality}
          configId={row.id}
          decomposeReturn={row.decompose_return}
          sections="recycle"
          showSectionLabels={false}
          layout="inline"
        />
      </td>
    </tr>
  )
}

function ProgressionList({
  rows,
  starVariant,
  cardQuality = 1,
  skillsById,
  renderSkillEffect,
}: {
  rows: ProgressionRow[]
  starVariant: StarVariant
  cardQuality?: number
  skillsById: Map<string, SkillConfig>
  renderSkillEffect: (skill: SkillConfig | undefined, lv: number) => ReactNode
}) {
  return (
    <div className="force-card-progression-table">
      <table>
        <ForceCardSkillTableHeader />
        <tbody>
          {rows.map((row) => (
            <ProgressionSkillRow
              key={row.id}
              row={row}
              starVariant={starVariant}
              cardQuality={cardQuality}
              skillsById={skillsById}
              renderSkillEffect={renderSkillEffect}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ForceCardProgression({ starUps, awakens = [], cardQuality = 1 }: Props) {
  const { lang } = useLanguage()
  const { t } = useUiTranslation()
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [skillsById, setSkillsById] = useState<Map<string, SkillConfig>>(new Map())
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})

  const getT = (key?: string) => (key ? translations[key] || key : '')

  useEffect(() => setupGlobalSkillTooltips(), [])

  const validStarUps = useMemo(
    () => (Array.isArray(starUps) ? [...starUps].sort((a, b) => a.id - b.id) : []),
    [starUps]
  )

  const validAwakens = useMemo(
    () => (Array.isArray(awakens) ? [...awakens].sort((a, b) => a.id - b.id) : []),
    [awakens]
  )

  const targetSkillIds = useMemo(() => {
    const ids = new Set<string>()
    for (const row of [...validStarUps, ...validAwakens]) {
      const ups = normalizeSkillRefList(row?.skill_up)
      const id = ups[0]?.skill_id
      if (id != null) ids.add(String(id))
    }
    return Array.from(ids)
  }, [validStarUps, validAwakens])

  useEffect(() => {
    const load = async () => {
      if (!targetSkillIds.length) {
        setSkillsById(new Map())
        setValuesMap({})
        setTranslations({})
        return
      }

      const { data: skills } = await supabase
        .from('SkillConfig')
        .select('*')
        .in('skillid', targetSkillIds)

      const all: SkillConfig[] = skills || []
      const tKeys = new Set<string>()
      all.forEach((s) => {
        if (s.name?.startsWith?.('LC_')) tKeys.add(s.name)
        normalizeDesValueList(s.skill_des).forEach((d) => d.des && tKeys.add(d.des))
        normalizeDesValueList(s.skill_sketch).forEach((d) => d.des && tKeys.add(d.des))
      })
      setTranslations(await translateKeys(Array.from(tKeys), lang))

      const valueIds = new Set<number>()
      all.forEach((s) => {
        ;['skill_des', 'skill_sketch'].forEach((field) => {
          normalizeDesValueList((s as Record<string, unknown>)[field]).forEach((node) => {
            const v = Number(node.value)
            if (!Number.isNaN(v)) valueIds.add(v)
          })
        })
      })
      setValuesMap(await loadSkillValues(Array.from(valueIds)))
      setSkillsById(new Map(all.map((s) => [String(s.skillid), s])))
    }
    load()
  }, [targetSkillIds, lang])

  const renderSkillEffect = (skill: SkillConfig | undefined, lv: number) => {
    if (!skill) return <span className="force-card-material-empty">—</span>

    const descriptions = normalizeDesValueList(skill.skill_des)
    const sketches = normalizeDesValueList(skill.skill_sketch)
    const desEntry = descriptions.find((_, i) => i + 1 === lv) ?? descriptions[descriptions.length - 1]
    const sketchEntry = sketches.find((_, i) => i + 1 === lv) ?? sketches[sketches.length - 1]
    const entry = desEntry?.des ? desEntry : sketchEntry

    if (!entry?.des) return <span className="force-card-material-empty">—</span>

    const html = applySkillValues(getT(entry.des), entry.value ?? 0, valuesMap)
    return <span dangerouslySetInnerHTML={{ __html: html }} />
  }

  if (!validStarUps.length && !validAwakens.length) {
    return (
      <div className="force-card-progression-empty">
        <p>{t(UI_KEYS.forceCard.noProgressionData)}</p>
      </div>
    )
  }

  const listProps = {
    skillsById,
    renderSkillEffect,
    cardQuality,
  }

  return (
    <div className="force-card-progression">
      {validStarUps.length > 0 ? (
        <ProgressionList rows={validStarUps} starVariant="normal" {...listProps} />
      ) : null}

      {validAwakens.length > 0 ? (
        <div className="force-card-progression__section">
          <h3 className="force-card-progression__subtitle">{t(UI_KEYS.common.awakening)}</h3>
          <ProgressionList rows={validAwakens} starVariant="awaken" {...listProps} />
        </div>
      ) : null}
    </div>
  )
}
