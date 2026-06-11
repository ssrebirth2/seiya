'use client'

import React from 'react'
import { applySkillValues } from '@/lib/game/apply-skill-values'
import {
  normalizeDesValueList,
  parsePrimitiveList,
} from '@/lib/game/parse-game-data'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { TalentLayerSkill } from '@/lib/game/talent-types'
import { TALENT_ICON_CLASS } from '@/lib/assets/talent-images'
import { layerAwakeningMaterials } from '@/lib/game/aggregate-consume'
import { resolveSkillIconUrl } from '@/lib/game/resolve-skill-icon'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import HeroTalentMaterialsRow from './HeroTalentMaterialsRow'
import {
  HeroTalentNotImplemented,
  isNotAvailableLabel,
} from './HeroTalentNotImplemented'
import { NOT_AVAILABLE_LABEL } from '@/lib/i18n/language-package'
import { resolveSkillTypeLabel } from '@/lib/game/format-skill-labels'
import SkillCooldownMeta from './SkillCooldownMeta'
import { hasSkillCooldown } from '@/lib/game/format-skill-cooldown'

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

  const cardShell = (children: React.ReactNode) => (
    <div className="rounded-xl border border-panel-border bg-panel p-3 sm:p-4">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted sm:text-sm">
        Layer Awakening Skill
      </h4>
      {children}
      {(layerMaterials.length > 0 || cumulativeMaterials.length > 0) && (
        <HeroTalentMaterialsRow
          materials={layerMaterials}
          cumulative={cumulativeMaterials}
          consumeRefMap={consumeRefMap}
        />
      )}
    </div>
  )

  if (!skill) {
    return cardShell(
      <HeroTalentNotImplemented subtitle="Skill configuration exists, but no skill data was found." />
    )
  }

  const name = getT(String(skill.name ?? ''))
  const skillTypeRaw = resolveSkillTypeLabel(skill.skill_type, getT)
  const skillType = isNotAvailableLabel(skillTypeRaw) ? '' : skillTypeRaw

  const labels = parsePrimitiveList(skill.label_list)
    .map((id) => labelMap[Number(id)])
    .filter((label) => label && !isNotAvailableLabel(label))
    .join(', ')

  const desList = normalizeDesValueList(skill.skill_des)
  const descriptionKey = desList[0]?.des
  const descriptionRaw = descriptionKey ? getT(descriptionKey) : ''
  const mainDescription =
    descriptionRaw && !isNotAvailableLabel(descriptionRaw)
      ? applySkillValues(descriptionRaw, desList[0].value ?? 0, valuesMap)
      : ''

  const skillUnavailable = isNotAvailableLabel(name)
  const iconPath = skillUnavailable ? '' : resolveSkillIconUrl(skill)

  if (skillUnavailable) {
    return cardShell(
      <HeroTalentNotImplemented subtitle="Skill text has not been added to the language files yet." />
    )
  }

  const hasSkillBody =
    Boolean(iconPath || name) ||
    Boolean(skillType || labels || mainDescription || hasSkillCooldown(skill.cd))

  if (!hasSkillBody) {
    return cardShell(
      <HeroTalentNotImplemented subtitle="Skill data exists but has no displayable content yet." />
    )
  }

  return cardShell(
    <>
      <div className="mb-3 flex items-start gap-3">
        {iconPath ? (
          <img src={iconPath} alt={name} className={TALENT_ICON_CLASS} />
        ) : (
          <div
            className={`${TALENT_ICON_CLASS} rounded-xl border border-panel-border bg-panel-hover`}
            aria-hidden
          />
        )}
        <div className="min-w-0">
          <p className="text-base font-semibold leading-tight sm:text-lg">{name}</p>
          {skillType && <p className="text-sm text-text-muted">{skillType}</p>}
        </div>
      </div>

      <div className="mb-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
        <SkillCooldownMeta cd={skill.cd} />
        {labels && (
          <p>
            <strong>Tags:</strong> {labels}
          </p>
        )}
      </div>

      {mainDescription ? (
        <div
          className="mb-3 text-sm text-text-muted whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: mainDescription }}
        />
      ) : descriptionKey ? (
        <p className="mb-3 text-sm italic text-text-muted">{NOT_AVAILABLE_LABEL}</p>
      ) : null}
    </>
  )
}
