'use client'

import React from 'react'
import { applySkillValues } from '@/lib/game/apply-skill-values'
import {
  normalizeConditionList,
  normalizeDesValueList,
  parsePrimitiveList,
} from '@/lib/game/parse-game-data'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { TalentLayerSkill } from '@/lib/game/talent-types'
import { layerAwakeningMaterials } from '@/lib/game/aggregate-consume'
import { resolveSkillIconUrl } from '@/lib/game/resolve-skill-icon'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import HeroTalentMaterialsRow from './HeroTalentMaterialsRow'
import {
  HeroTalentNotImplemented,
  isNotAvailableLabel,
} from './HeroTalentNotImplemented'
import { NO_DATA_LC_KEY, UI_KEYS } from '@/lib/i18n/ui-keys'
import { resolveSkillTypeLabel } from '@/lib/game/format-skill-labels'
import { SkillDetailCard, type SkillDetailLine } from './SkillDetailCard'

interface HeroTalentSkillCardProps {
  layerSkill: TalentLayerSkill
  cumulativeMaterials: ConsumeEntry[]
  getT: (key?: string) => string
  valuesMap: Record<number, (string | number)[]>
  labelMap: Record<number, string>
  consumeRefMap: ConsumeRefMap
}

export default function HeroTalentSkillCard({
  layerSkill,
  cumulativeMaterials,
  getT,
  valuesMap,
  labelMap,
  consumeRefMap,
}: HeroTalentSkillCardProps) {
  const skill = layerSkill.skillRow
  const layerMaterials = layerAwakeningMaterials(layerSkill)
  const noDataLabel = getT(NO_DATA_LC_KEY) || getT(UI_KEYS.common.noData)

  const shell = (children: React.ReactNode) => (
    <>
      <header className="hero-talents-panel__head">
        <h4 className="hero-talents-section__title">
          {getT(UI_KEYS.hero.talentAwakenSkill)}
        </h4>
      </header>
      <div className="hero-talents-skill">{children}</div>
      {(layerMaterials.length > 0 || cumulativeMaterials.length > 0) && (
        <HeroTalentMaterialsRow
          materials={layerMaterials}
          cumulative={cumulativeMaterials}
          consumeRefMap={consumeRefMap}
          materialsLabel={getT(UI_KEYS.hero.talentAwakenMaterials)}
        />
      )}
    </>
  )

  if (!skill) {
    return shell(<HeroTalentNotImplemented />)
  }

  const name = getT(String(skill.name ?? ''))
  const skillTypeRaw = resolveSkillTypeLabel(skill.skill_type, getT)
  const skillType = isNotAvailableLabel(skillTypeRaw) ? '' : skillTypeRaw

  const tagLabels = parsePrimitiveList(skill.label_list)
    .map((id) => labelMap[Number(id)])
    .filter((label): label is string => Boolean(label) && !isNotAvailableLabel(label))

  const desList = normalizeDesValueList(skill.skill_des)
  const descriptionKey = desList[0]?.des
  const descriptionRaw = descriptionKey ? getT(descriptionKey) : ''
  const mainDescription =
    descriptionRaw && !isNotAvailableLabel(descriptionRaw)
      ? applySkillValues(descriptionRaw, desList[0].value ?? 0, valuesMap)
      : descriptionKey
        ? `<p class="italic">${noDataLabel}</p>`
        : ''

  const sketches = normalizeDesValueList(skill.skill_sketch)
  const conds = normalizeConditionList(skill.skill_condition)
  const levelLines: SkillDetailLine[] = sketches
    .map((s, i) => {
      if (!s.des) return { level: i + 1, text: '', condition: '' }
      const raw = getT(s.des)
      const text = isNotAvailableLabel(raw)
        ? noDataLabel
        : applySkillValues(raw, s.value ?? 0, valuesMap)
      return {
        level: i + 1,
        text,
        condition: conds[i] ? getT(conds[i]) : '',
      }
    })
    .filter((line) => line.text || line.condition)

  const skillUnavailable = isNotAvailableLabel(name)
  const iconPath = skillUnavailable ? '' : resolveSkillIconUrl(skill)

  if (skillUnavailable) {
    return shell(<HeroTalentNotImplemented />)
  }

  const hasSkillBody =
    Boolean(iconPath || name) ||
    Boolean(skillType || tagLabels.length || mainDescription || levelLines.length)

  if (!hasSkillBody) {
    return shell(<HeroTalentNotImplemented />)
  }

  return shell(
    <SkillDetailCard
      skill={skill as Record<string, unknown>}
      name={name}
      iconPath={iconPath}
      skillTypeLabel={skillType}
      tagLabels={tagLabels}
      mainDescriptionHtml={mainDescription}
      levelLines={levelLines}
      noDataLabel={noDataLabel}
      getT={getT}
      density="compact"
      nested
      sections={{
        levels: levelLines.length > 0,
        subskills: false,
      }}
    />
  )
}
