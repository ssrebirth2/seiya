'use client'

import type { ReactNode } from 'react'
import { formatSkillCooldown, hasSkillCooldown } from '@/lib/game/format-skill-cooldown'
import { isNotAvailableLabel } from '@/lib/game/format-skill-labels'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

export type SkillDetailLine = {
  level: number
  text: string
  condition?: string
}

type SkillDetailCardProps = {
  skill: Record<string, unknown>
  name: string
  iconPath: string
  skillTypeLabel: string
  tagLabels: string[]
  mainDescriptionHtml: string
  levelLines: SkillDetailLine[]
  subskills?: ReactNode
  noDataLabel: string
  getT: (key?: string) => string
  nested?: boolean
}

function formatHeroLevelLabel(level: number, getT: (key?: string) => string): string {
  const template = getT(UI_KEYS.common.heroLv)
  if (template.includes('{0}')) return template.replace('{0}', String(level))
  return `${template} ${level}`
}

export function SkillDetailCard({
  skill,
  name,
  iconPath,
  skillTypeLabel,
  tagLabels,
  mainDescriptionHtml,
  levelLines,
  subskills,
  noDataLabel,
  getT,
  nested = false,
}: SkillDetailCardProps) {
  const { t } = useUiTranslation()
  const cd = skill.cd
  const hasCooldown = hasSkillCooldown(cd)

  const typeChip =
    skillTypeLabel && !isNotAvailableLabel(skillTypeLabel, noDataLabel) ? skillTypeLabel : null

  return (
    <article className={`skill-detail-card${nested ? ' skill-detail-card--nested' : ''}`}>
      <div className="skill-detail-card__inner">
        <header className="skill-detail-card__header">
          {iconPath ? (
            <div className="skill-detail-card__icon-frame">
              <img src={iconPath} alt={name} className="skill-detail-card__icon" />
            </div>
          ) : null}

          <div className="skill-detail-card__head">
            <h3 className="skill-detail-card__title">{name}</h3>

            {(typeChip || hasCooldown || tagLabels.length > 0) && (
              <div className="skill-detail-card__chips" role="list">
                {typeChip ? (
                  <span className="skill-detail-card__chip" role="listitem">
                    {typeChip}
                  </span>
                ) : null}
                {hasCooldown ? (
                  <span className="skill-detail-card__chip" role="listitem">
                    {formatSkillCooldown(cd, t)}
                  </span>
                ) : null}
                {tagLabels.map((tag) => (
                  <span
                    key={`${skill.skillid}-tag-${tag}`}
                    className="skill-detail-card__chip"
                    role="listitem"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        {mainDescriptionHtml ? (
          <section className="skill-detail-card__section" aria-labelledby={`skill-${skill.skillid}-desc`}>
            <h4 id={`skill-${skill.skillid}-desc`} className="skill-detail-card__section-title">
              {t(UI_KEYS.common.description)}
            </h4>
            <div
              className="skill-detail-card__prose"
              dangerouslySetInnerHTML={{ __html: mainDescriptionHtml }}
            />
          </section>
        ) : null}

        {levelLines.length > 0 ? (
          <section className="skill-detail-card__section" aria-labelledby={`skill-${skill.skillid}-levels`}>
            <h4 id={`skill-${skill.skillid}-levels`} className="skill-detail-card__section-title">
              {t(UI_KEYS.common.effect)}
            </h4>
            <ol className="skill-detail-card__levels">
              {levelLines.map((line) => (
                <li key={`${skill.skillid}-lv-${line.level}`} className="skill-detail-card__level">
                  <span className="skill-detail-card__level-badge" aria-hidden>
                    {formatHeroLevelLabel(line.level, getT)}
                  </span>
                  <div className="skill-detail-card__level-body">
                    {line.text ? (
                      <span dangerouslySetInnerHTML={{ __html: line.text }} />
                    ) : (
                      <span className="italic">{noDataLabel}</span>
                    )}
                    {line.condition && !isNotAvailableLabel(line.condition, noDataLabel) ? (
                      <span className="skill-detail-card__condition">({line.condition})</span>
                    ) : null}
                    {line.condition && isNotAvailableLabel(line.condition, noDataLabel) ? (
                      <span className="skill-detail-card__condition">({noDataLabel})</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {subskills ? (
          <section className="skill-detail-card__section" aria-labelledby={`skill-${skill.skillid}-sub`}>
            <h4 id={`skill-${skill.skillid}-sub`} className="skill-detail-card__section-title">
              {t(UI_KEYS.hero.skillsTab)}
            </h4>
            <div className="skill-detail-card__subskills">{subskills}</div>
          </section>
        ) : null}
      </div>
    </article>
  )
}
