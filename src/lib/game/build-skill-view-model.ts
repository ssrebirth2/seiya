import { applySkillValues } from '@/lib/game/apply-skill-values'
import {
  isNotAvailableLabel,
  resolveSkillTypeLabel,
} from '@/lib/game/format-skill-labels'
import {
  normalizeConditionList,
  normalizeDesValueList,
  parsePrimitiveList,
} from '@/lib/game/parse-game-data'
import { resolveSkillIconUrl } from '@/lib/game/resolve-skill-icon'
import { NOT_AVAILABLE_LABEL } from '@/lib/i18n/language-package'
import { NO_DATA_LC_KEY } from '@/lib/i18n/ui-keys'

export type SkillViewModelLine = {
  level: number
  text: string
  condition?: string
}

export type SkillViewModel = {
  skillId: string
  skill: Record<string, unknown>
  name: string
  iconPath: string
  skillTypeLabel: string
  tagLabels: string[]
  mainDescriptionHtml: string
  levelLines: SkillViewModelLine[]
  subskillIds: string[]
}

type BuildSkillViewModelArgs = {
  skill: Record<string, unknown>
  getT: (key?: string) => string
  noDataLabel: string
  valuesMap: Record<number, (string | number)[]>
  labelMap: Record<number, string>
  preferAwakenSketch?: boolean
}

/** Missing / pending / unresolved LC → localized "No data record." (all skill types). */
function displayOrNoData(raw: string, noDataLabel: string): string {
  if (!raw.trim() || isNotAvailableLabel(raw, noDataLabel)) return noDataLabel
  return raw
}

export function buildSkillViewModel({
  skill,
  getT,
  noDataLabel,
  valuesMap,
  labelMap,
  preferAwakenSketch = false,
}: BuildSkillViewModelArgs): SkillViewModel {
  const skillId = String(skill.skillid ?? '')
  const name = displayOrNoData(getT(String(skill.name ?? '')), noDataLabel)
  const skillTypeLabel = resolveSkillTypeLabel(skill.skill_type, getT)
  const noDataLc = getT(NO_DATA_LC_KEY)
  const tagLabels = parsePrimitiveList(skill.label_list)
    .map((id) => labelMap[Number(id)])
    .filter((label): label is string => {
      if (!label?.trim()) return false
      if (isNotAvailableLabel(label, noDataLabel)) return false
      if (isNotAvailableLabel(label, noDataLc)) return false
      if (label === NOT_AVAILABLE_LABEL) return false
      return true
    })

  // Awaken skills: game uses awaken_skill_des for level progression
  // (GetAwakenSkillContentDesc). Some rows (e.g. 61190) point skill_sketch at
  // LC keys that were never shipped — only awaken_* keys exist.
  const awakenDes = normalizeDesValueList(skill.awaken_skill_des)
  const preferAwaken = Boolean(preferAwakenSketch && awakenDes.length > 0)

  // Main blurb stays on skill_des (base tip); awaken texts are the level list.
  const desList = normalizeDesValueList(skill.skill_des)
  const mainDescriptionHtml =
    desList.length > 0
      ? (() => {
          const raw = getT(desList[0].des)
          if (!raw.trim() || isNotAvailableLabel(raw, noDataLabel)) {
            return `<p class="italic">${noDataLabel}</p>`
          }
          return applySkillValues(raw, desList[0].value ?? 0, valuesMap)
        })()
      : ''

  let sketches = normalizeDesValueList(preferAwaken ? skill.awaken_skill_des : skill.skill_sketch)
  let sketchTexts = sketches.map((s) => {
    if (!s.des) return noDataLabel
    const raw = getT(s.des)
    if (!raw.trim() || isNotAvailableLabel(raw, noDataLabel)) return noDataLabel
    return applySkillValues(raw, s.value ?? 0, valuesMap)
  })

  // If sketch progression is empty/unresolved but awaken_skill_des exists, use awaken.
  if (
    !preferAwaken &&
    awakenDes.length > 0 &&
    sketchTexts.every((t) => !t.trim() || isNotAvailableLabel(t, noDataLabel))
  ) {
    sketches = awakenDes
    sketchTexts = sketches.map((s) => {
      if (!s.des) return noDataLabel
      const raw = getT(s.des)
      if (!raw.trim() || isNotAvailableLabel(raw, noDataLabel)) return noDataLabel
      return applySkillValues(raw, s.value ?? 0, valuesMap)
    })
  }

  const conds = normalizeConditionList(skill.skill_condition)
  const levelLines: SkillViewModelLine[] = sketchTexts
    .map((text, i) => {
      const conditionRaw = conds[i] ? getT(conds[i]) : ''
      const condition =
        conditionRaw && !isNotAvailableLabel(conditionRaw, noDataLabel) ? conditionRaw : undefined
      return {
        level: i + 1,
        text,
        condition,
      }
    })
    .filter((line) => line.text || line.condition)

  const subskillIds = parsePrimitiveList(skill.sub_skills).map((id) => String(id))
  const iconPath = resolveSkillIconUrl(skill as { iconpath?: string | null }) ?? ''

  return {
    skillId,
    skill,
    name,
    iconPath,
    skillTypeLabel,
    tagLabels,
    mainDescriptionHtml,
    levelLines,
    subskillIds,
  }
}
