'use client'

import { useEffect } from 'react'
import GameImage from '@/components/ui/GameImage'
import { useLanguage } from '@/context/language-context'
import { applySkillValues, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import { resolveSkillIconUrl } from '@/lib/game/resolve-skill-icon'
import { resolveSkillTypeLabel } from '@/lib/game/format-skill-labels'
import { normalizeDesValueList, parsePrimitiveList } from '@/lib/game/parse-game-data'
import { createTranslationGetter, NOT_AVAILABLE_LABEL } from '@/lib/i18n/language-package'
import { UI_KEYS } from '@/lib/i18n/ui-keys'
import type { HeroCosmoBundle } from '@/lib/game/cosmo-types'

type Props = Pick<HeroCosmoBundle, 'data' | 'translations' | 'valuesMap' | 'labelMap' | 'skillMap'>

export default function HeroCosmoPassives({ data, translations, valuesMap, labelMap, skillMap }: Props) {
  const { lang } = useLanguage()
  const getT = createTranslationGetter(translations, { lang })

  useEffect(() => {
    setupGlobalSkillTooltips()
  }, [])

  if (!data.passives.length) return null

  return (
    <section className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {getT(UI_KEYS.hero.cosmoPassives)}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.passives.map((passive) => {
          const skill = skillMap[passive.skillId]
          const senseLabel = getT(data.senseLabelKeys[passive.senseIndex - 1] ?? '')
          const name = skill?.name ? getT(String(skill.name)) : NOT_AVAILABLE_LABEL
          const iconPath = resolveSkillIconUrl(
            skill ? { skillid: skill.skillid, iconpath: skill.iconpath } : { skillid: passive.skillId }
          )
          const desList = normalizeDesValueList(skill?.skill_des)
          const descriptionKey = desList[0]?.des
          const descriptionRaw = descriptionKey ? getT(descriptionKey) : ''
          const descriptionHtml =
            descriptionRaw && descriptionRaw !== NOT_AVAILABLE_LABEL
              ? applySkillValues(descriptionRaw, desList[0]?.value ?? 0, valuesMap)
              : ''
          const skillType = resolveSkillTypeLabel(skill?.skill_type, getT)
          const tags = parsePrimitiveList(skill?.label_list)
            .map((id) => labelMap[Number(id)])
            .filter(Boolean)
            .join(', ')

          return (
            <article
              key={`${passive.pointId}-${passive.skillId}`}
              className="hero-cosmo-passive-card rounded-xl border border-panel-border bg-panel p-3"
            >
              <div className="mb-2 flex items-start gap-3">
                <GameImage
                  src={iconPath}
                  rawSrc={iconPath}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0">
                  <p className="font-medium text-text">{name}</p>
                  <p className="text-xs text-accent">{senseLabel}</p>
                  {skillType ? <p className="text-xs text-text-muted">{skillType}</p> : null}
                  {tags ? <p className="text-xs text-text-muted">{tags}</p> : null}
                </div>
              </div>
              {descriptionHtml ? (
                <div
                  className="skill-desc text-sm text-text-muted"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
