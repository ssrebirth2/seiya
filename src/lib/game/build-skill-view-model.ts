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
  const tagLabels = parsePrimitiveList(skill.label_list)
    .map((id) => labelMap[Number(id)])
    .filter((label): label is string => Boolean(label) && !isNotAvailableLabel(label, noDataLabel))

  // Awaken profile skills: game uses awaken_skill_des (GetAwakenSkillContentDesc), not skill_des.
  const desSource =
    preferAwakenSketch && normalizeDesValueList(skill.awaken_skill_des).length > 0
      ? skill.awaken_skill_des
      : skill.skill_des
  const desList = normalizeDesValueList(desSource)
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

  const sketchField = preferAwakenSketch ? 'awaken_skill_des' : 'skill_sketch'
  const sketches = normalizeDesValueList(skill[sketchField])
  const sketchTexts = sketches.map((s) => {
    if (!s.des) return noDataLabel
    const raw = getT(s.des)
    if (!raw.trim() || isNotAvailableLabel(raw, noDataLabel)) return noDataLabel
    return applySkillValues(raw, s.value ?? 0, valuesMap)
  })

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
