'use client'

import { useMemo } from 'react'
import GameImage from '@/components/ui/GameImage'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/game-images'
import { resolveAssetUrl } from '@/lib/assets/asset-registry'
import { applySkillValues, formatDisplayText } from '@/lib/game/apply-skill-values'
import { normalizeDesValueList } from '@/lib/game/parse-game-data'
import { resolveSkillIconUrl } from '@/lib/game/resolve-skill-icon'

type SkillRow = {
  skillid: number
  name?: string
  iconpath?: string
  skill_des?: unknown
  skill_sketch?: unknown
  label_list?: unknown
}

type CompanionSkillCardProps = {
  skill: SkillRow
  skillLevel?: number
  labelMap: Record<number, string>
  getT: (key?: string) => string
  valuesMap: Record<number, (string | number)[]>
}

export default function CompanionSkillCard({
  skill,
  skillLevel,
  labelMap,
  getT,
  valuesMap,
}: CompanionSkillCardProps) {
  const description = useMemo(() => {
    const desList = normalizeDesValueList(skill.skill_des)
    const first = desList[0]
    return first ? applySkillValues(getT(first.des), first.value ?? 0, valuesMap) : ''
  }, [skill, getT, valuesMap])

  const sketch = useMemo(() => {
    const desList = normalizeDesValueList(skill.skill_sketch)
    const first = desList[0]
    return first ? applySkillValues(getT(first.des), first.value ?? 0, valuesMap) : ''
  }, [skill, getT, valuesMap])

  const tags = useMemo(() => {
    let ids: number[] = []
    try {
      const raw = skill.label_list
      if (Array.isArray(raw)) ids = raw as number[]
      else if (typeof raw === 'string') ids = JSON.parse(raw)
    } catch {
      ids = []
    }
    return ids.map((id) => labelMap[id]).filter(Boolean).join(', ')
  }, [skill.label_list, labelMap])

  return (
    <div className="flex items-start gap-4">
      <GameImage
        src={resolveAssetUrl(resolveSkillIconUrl(skill), IMAGE_UNAVAILABLE)}
        alt={getT(skill.name)}
        className="h-16 w-16 shrink-0 rounded-lg border border-panel-border bg-panel-hover object-contain p-1"
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-foreground">{getT(skill.name)}</h3>
          {skillLevel != null && (
            <span className="badge-accent text-xs">Lv {skillLevel}</span>
          )}
        </div>
        {tags && <p className="mb-2 text-xs text-text-muted">{tags}</p>}
        {sketch && (
          <p
            className="mb-2 text-sm font-medium text-foreground"
            dangerouslySetInnerHTML={{ __html: formatDisplayText(sketch, 0, {}) }}
          />
        )}
        {description && (
          <p
            className="text-sm leading-relaxed text-text-muted"
            dangerouslySetInnerHTML={{ __html: formatDisplayText(description, 0, {}) }}
          />
        )}
      </div>
    </div>
  )
}
