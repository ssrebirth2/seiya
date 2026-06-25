'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import {
  applySkillValues,
  loadSkillValues,
  setupGlobalSkillTooltips,
} from '@/lib/game/apply-skill-values'
import {
  normalizeDesValueList,
  normalizeSkillRefList,
} from '@/lib/game/parse-game-data'
import { SkillDetailCard } from '@/components/heroes/SkillDetailCard'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'

type Props = {
  info: any
  getT: (key?: string) => string
}

export default function ForceCardOverview({ info, getT }: Props) {
  const { site } = useUiTranslation()
  const [skill, setSkill] = useState<any>(null)
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})

  useEffect(() => setupGlobalSkillTooltips(), [])

  const starSkillRef = useMemo(() => {
    const starIds = normalizeSkillRefList(info?.card_star)
    return starIds[0] ?? null
  }, [info?.card_star])

  useEffect(() => {
    const loadSkill = async () => {
      if (!starSkillRef?.skill_id) {
        setSkill(null)
        setValuesMap({})
        return
      }

      const { data } = await supabase
        .from('SkillConfig')
        .select('*')
        .eq('skillid', starSkillRef.skill_id)
        .maybeSingle()

      if (!data) {
        setSkill(null)
        return
      }

      const valueIds = new Set<number>()
      normalizeDesValueList(data.skill_des).forEach((node) => {
        const v = Number(node.value)
        if (!Number.isNaN(v)) valueIds.add(v)
      })
      const vMap = await loadSkillValues(Array.from(valueIds))
      setValuesMap(vMap)
      setSkill(data)
    }

    loadSkill()
  }, [starSkillRef])

  const skillLv = Number(starSkillRef?.skill_lv ?? 1)
  const skillSketch = useMemo(() => {
    if (!skill) return ''
    const sketches = normalizeDesValueList(skill.skill_sketch)
    const entry = sketches.find((_, i) => i + 1 === skillLv) ?? sketches[0]
    if (!entry?.des) return ''
    return applySkillValues(getT(entry.des), entry.value ?? 0, valuesMap)
  }, [skill, skillLv, valuesMap, getT])

  const skillDescription = useMemo(() => {
    if (!skill) return ''
    const entries = normalizeDesValueList(skill.skill_des)
    const entry = entries.find((_, i) => i + 1 === skillLv) ?? entries[0]
    if (!entry?.des) return ''
    return applySkillValues(getT(entry.des), entry.value ?? 0, valuesMap)
  }, [skill, skillLv, valuesMap, getT])

  return (
    <div className="space-y-6">
      {skill ? (
        <SkillDetailCard
          skill={skill}
          name={getT(skill.name)}
          iconPath=""
          skillTypeLabel=""
          tagLabels={[]}
          mainDescriptionHtml={skillDescription || skillSketch}
          levelLines={
            skillSketch && skillDescription
              ? [{ level: skillLv, text: skillSketch }]
              : []
          }
          noDataLabel={site('noSkills')}
          getT={getT}
        />
      ) : null}
    </div>
  )
}
