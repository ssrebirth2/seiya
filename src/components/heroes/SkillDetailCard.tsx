'use client'

import { useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import GameImage from '@/components/ui/GameImage'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/game-images'
import { formatSkillCooldown, hasSkillCooldown } from '@/lib/game/format-skill-cooldown'
import { isNotAvailableLabel } from '@/lib/game/format-skill-labels'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

export type SkillDetailLine = {
  level: number
  text: string
  condition?: string
}

export type SkillDetailSections = {
  description?: boolean
  levels?: boolean
  subskills?: boolean
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
  /** Artifact relic skill: description beside icon instead of title + separate section. */
  headerMode?: 'default' | 'description'
  /** Toggle which body sections render. Defaults: all on. */
  sections?: SkillDetailSections
  /** Override subskills section title (defaults to skills tab LC). */
  subskillsTitle?: string
  /** When false, omit the title in the card header (e.g. modal already shows it). */
  showTitle?: boolean
  /** Tighter layout for stacked skill lists. */
  density?: 'default' | 'compact'
}

function formatHeroLevelLabel(level: number, getT: (key?: string) => string): string {
  const template = getT(UI_KEYS.common.heroLv)
  if (template.includes('{0}')) return template.replace('{0}', String(level))
  return `${template} ${level}`
}

function SkillLevelList({
  skillId,
  levelLines,
  noDataLabel,
  getT,
}: {
  skillId: unknown
  levelLines: SkillDetailLine[]
  noDataLabel: string
  getT: (key?: string) => string
}) {
  return (
    <ol className="skill-detail-card__levels">
      {levelLines.map((line) => (
        <li key={`${skillId}-lv-${line.level}`} className="skill-detail-card__level">
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
  )
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      '.skill-link, .skill-detail-card__dropdown, .skill-detail-card__related, button, a, summary, input, select, textarea'
    )
  )
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
  headerMode = 'default',
  sections,
  subskillsTitle,
  showTitle = true,
  density = 'default',
}: SkillDetailCardProps) {
  const { t, site } = useUiTranslation()
  const [expanded, setExpanded] = useState(false)
  const cd = skill.cd
  const hasCooldown = hasSkillCooldown(cd)
  const descriptionInHeader = headerMode === 'description'
  const compact = density === 'compact'
  const related = nested && compact
  const showDescription = sections?.description !== false
  const showLevels = sections?.levels !== false
  const showSubskills = sections?.subskills !== false
  const levelsTitle = t(UI_KEYS.common.effect)
  const levelsId = `skill-${skill.skillid}-levels`
  const hasLevels = showLevels && levelLines.length > 0
  const hasInlineDescription =
    compact && showDescription && Boolean(mainDescriptionHtml) && !descriptionInHeader
  // Only root compact cards expand; related skills stay fully readable (no nested accordions).
  const cardExpands = compact && !related && (hasLevels || hasInlineDescription)

  const typeChip =
    skillTypeLabel && !isNotAvailableLabel(skillTypeLabel, noDataLabel) ? skillTypeLabel : null

  const levelsContent = (
    <SkillLevelList
      skillId={skill.skillid}
      levelLines={levelLines}
      noDataLabel={noDataLabel}
      getT={getT}
    />
  )

  const toggleExpanded = () => setExpanded((open) => !open)

  const onCardClick = (event: MouseEvent<HTMLElement>) => {
    if (!cardExpands || isInteractiveTarget(event.target)) return
    toggleExpanded()
  }

  const onCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!cardExpands) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleExpanded()
    }
  }

  return (
    <article
      className={[
        'skill-detail-card',
        nested ? 'skill-detail-card--nested' : '',
        descriptionInHeader ? 'skill-detail-card--description-header' : '',
        compact ? 'skill-detail-card--compact' : '',
        related ? 'skill-detail-card--related' : '',
        cardExpands ? 'skill-detail-card--expandable' : '',
        cardExpands && expanded ? 'is-expanded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onCardClick}
      onKeyDown={onCardKeyDown}
      role={cardExpands ? 'button' : undefined}
      tabIndex={cardExpands ? 0 : undefined}
      aria-expanded={cardExpands ? expanded : undefined}
      aria-controls={cardExpands && hasLevels ? levelsId : undefined}
    >
      <div className="skill-detail-card__inner">
        <header className="skill-detail-card__header">
          <div className="skill-detail-card__icon-frame">
            <GameImage
              src={iconPath || IMAGE_UNAVAILABLE}
              rawSrc={iconPath || undefined}
              alt={name}
              className="skill-detail-card__icon"
            />
          </div>

          <div className="skill-detail-card__head">
            {descriptionInHeader ? (
              mainDescriptionHtml ? (
                <div
                  className="skill-detail-card__prose skill-detail-card__prose--header"
                  dangerouslySetInnerHTML={{ __html: mainDescriptionHtml }}
                />
              ) : null
            ) : showTitle ? (
              <div className="skill-detail-card__title-row">
                <h3 className="skill-detail-card__title">{name}</h3>
                {cardExpands ? (
                  <span className="skill-detail-card__expand-hint" aria-hidden>
                    <ChevronDown
                      className="skill-detail-card__expand-chevron"
                      size={18}
                    />
                  </span>
                ) : null}
              </div>
            ) : null}

            {!descriptionInHeader && (typeChip || hasCooldown || tagLabels.length > 0) && (
              <div
                className={`skill-detail-card__chips${showTitle ? '' : ' skill-detail-card__chips--flush'}`}
                role="list"
              >
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

        {hasInlineDescription ? (
          <div
            className={[
              'skill-detail-card__prose',
              'skill-detail-card__prose--inline',
              related || expanded ? 'is-expanded' : 'is-clamped',
            ].join(' ')}
            dangerouslySetInnerHTML={{ __html: mainDescriptionHtml }}
          />
        ) : null}

        {!compact && showDescription && mainDescriptionHtml && !descriptionInHeader ? (
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

        {hasLevels ? (
          compact ? (
            related || expanded ? (
              <div
                id={levelsId}
                className="skill-detail-card__levels-panel"
                role="region"
                aria-label={levelsTitle}
              >
                {levelsContent}
              </div>
            ) : null
          ) : (
            <section className="skill-detail-card__section" aria-labelledby={levelsId}>
              <h4 id={levelsId} className="skill-detail-card__section-title">
                {levelsTitle}
              </h4>
              {levelsContent}
            </section>
          )
        ) : null}

        {showSubskills && subskills && !related ? (
          compact ? (
            <details
              className="skill-detail-card__related"
              onClick={(event) => event.stopPropagation()}
            >
              <summary className="skill-detail-card__related-summary">
                <span id={`skill-${skill.skillid}-sub`}>
                  {subskillsTitle ?? site('relatedSkills')}
                </span>
                <ChevronDown
                  className="skill-detail-card__related-chevron"
                  size={15}
                  aria-hidden
                />
              </summary>
              <div
                className="skill-detail-card__related-panel"
                role="region"
                aria-labelledby={`skill-${skill.skillid}-sub`}
              >
                <div className="skill-detail-card__subskills">{subskills}</div>
              </div>
            </details>
          ) : (
            <section className="skill-detail-card__section" aria-labelledby={`skill-${skill.skillid}-sub`}>
              <h4 id={`skill-${skill.skillid}-sub`} className="skill-detail-card__section-title">
                {subskillsTitle ?? site('relatedSkills')}
              </h4>
              <div className="skill-detail-card__subskills">{subskills}</div>
            </section>
          )
        ) : null}
      </div>
    </article>
  )
}
