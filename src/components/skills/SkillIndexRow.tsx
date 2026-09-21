'use client'

import { useEffect, useMemo, type KeyboardEvent, type MouseEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import GameImage from '@/components/ui/GameImage'
import { SkillOwnerThumbs } from '@/components/skills/SkillOwnerThumbs'
import { MetaChip } from '@/components/ui/v2'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/game-images'
import { buildSkillViewModel } from '@/lib/game/build-skill-view-model'
import { isNotAvailableLabel, skillTypeLcKey } from '@/lib/game/format-skill-labels'
import type { SkillCatalogRow } from '@/lib/game/skill-catalog'
import {
  incompletenessMessages,
  skillDisplayIconUrl,
  skillDisplayName,
  type SkillDisplayCopy,
} from '@/lib/game/skill-completeness'
import {
  firstForceCardOwnerDisplay,
  type SkillOwnerDisplay,
} from '@/lib/game/skill-owner-display'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type SkillIndexRowProps = {
  row: SkillCatalogRow
  getT: (key?: string) => string
  displayCopy: SkillDisplayCopy
  ownerDisplayMap: Map<string, SkillOwnerDisplay>
  valuesMap: Record<number, (string | number)[]>
  labelMap: Record<number, string>
  expanded: boolean
  onToggle: () => void
  bandLabel: string
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('a, button, input, select, textarea, .skill-link'))
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function SkillIndexRow({
  row,
  getT,
  displayCopy,
  ownerDisplayMap,
  valuesMap,
  labelMap,
  expanded,
  onToggle,
  bandLabel,
}: SkillIndexRowProps) {
  const { t, site, noData } = useUiTranslation()
  const skillNameInfo = skillDisplayName(row.raw, getT, displayCopy)
  const skillIconUrl = skillDisplayIconUrl(row.raw) || IMAGE_UNAVAILABLE
  const cardOwner = firstForceCardOwnerDisplay(row.owners, ownerDisplayMap)
  // Force-card (Poder Supremo) skills: show card name + icon, not empty SkillConfig fields.
  const useCardIdentity = row.band === 'force_card' && Boolean(cardOwner)
  const nameInfo =
    useCardIdentity && cardOwner && !cardOwner.name.startsWith('#')
      ? { text: cardOwner.name, isPlaceholder: false }
      : skillNameInfo
  const iconUrl =
    useCardIdentity && cardOwner && cardOwner.iconUrl !== IMAGE_UNAVAILABLE
      ? cardOwner.iconUrl
      : skillIconUrl
  const typeKey = skillTypeLcKey(row.skillType)
  const typeLabel = typeKey ? getT(typeKey) : ''

  const vm = useMemo(
    () =>
      buildSkillViewModel({
        skill: row.raw as unknown as Record<string, unknown>,
        getT,
        noDataLabel: displayCopy.noDescription,
        valuesMap,
        labelMap,
        preferAwakenSketch: row.band === 'awaken',
      }),
    [row.raw, row.band, getT, displayCopy.noDescription, valuesMap, labelMap]
  )

  const incomplete = incompletenessMessages(
    row.flags,
    {
      ...displayCopy,
      noNameYet: site('skillNoNameYet'),
      noIconYet: site('skillNoIconYet'),
      noDesYet: site('skillNoDesYet'),
    },
    {
      hasName: !nameInfo.isPlaceholder,
      hasIcon: iconUrl !== IMAGE_UNAVAILABLE,
    }
  )

  const levelLines = useMemo(
    () =>
      vm.levelLines.filter((line) => {
        const plain = stripHtml(line.text || '')
        if (!plain) return Boolean(line.condition)
        return !isNotAvailableLabel(plain, displayCopy.noDescription) && plain !== noData
      }),
    [vm.levelLines, displayCopy.noDescription, noData]
  )

  const desHtml = vm.mainDescriptionHtml
  const hasDes =
    Boolean(desHtml) &&
    !isNotAvailableLabel(stripHtml(desHtml), displayCopy.noDescription) &&
    stripHtml(desHtml) !== noData

  const hasExpandableBody =
    hasDes || levelLines.length > 0 || incomplete.length > 0 || vm.subskillIds.length > 0

  const onRowClick = (event: MouseEvent<HTMLElement>) => {
    if (!hasExpandableBody || isInteractiveTarget(event.target)) return
    onToggle()
  }

  const onRowKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!hasExpandableBody) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onToggle()
    }
  }

  return (
    <article
      id={`skill-${row.skillid}`}
      className={[
        'skill-index-row',
        hasExpandableBody ? 'skill-index-row--expandable' : '',
        expanded ? 'is-expanded' : '',
        row.layer === 'sneakPeek' ? 'skill-index-row--sneak' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onRowClick}
      onKeyDown={onRowKeyDown}
      role={hasExpandableBody ? 'button' : undefined}
      tabIndex={hasExpandableBody ? 0 : undefined}
      aria-expanded={hasExpandableBody ? expanded : undefined}
    >
      <div className="skill-index-row__main">
        <div className="skill-index-row__icon">
          <GameImage src={iconUrl} alt={nameInfo.text} className="skill-index-row__icon-img" />
        </div>

        <div className="skill-index-row__content">
          <div className="skill-index-row__body">
            <div className="skill-index-row__topline">
              <h3
                className={[
                  'skill-index-row__title',
                  nameInfo.isPlaceholder ? 'skill-index-row__title--placeholder' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {nameInfo.text}
              </h3>

              <div className="skill-index-row__meta">
                {row.layer === 'sneakPeek' ? <MetaChip>{site('skillSneakPeek')}</MetaChip> : null}
                <MetaChip>{bandLabel}</MetaChip>
                {typeLabel ? <MetaChip>{typeLabel}</MetaChip> : null}
                {vm.tagLabels.slice(0, 3).map((tag, i) => (
                  <MetaChip key={`${row.skillid}-tag-${i}`}>{tag}</MetaChip>
                ))}
                <span className="skill-index-row__id">ID {row.skillid}</span>
              </div>
            </div>

            {hasDes ? (
              <section className="skill-index-row__section skill-index-row__section--des">
                <h4 className="skill-index-row__section-title">{t(UI_KEYS.common.description)}</h4>
                <div
                  className={[
                    'skill-index-row__prose',
                    !expanded ? 'skill-index-row__prose--clamped' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  dangerouslySetInnerHTML={{ __html: desHtml }}
                />
              </section>
            ) : (
              <p className="skill-index-row__des skill-index-row__des--placeholder">
                {displayCopy.noDescription}
              </p>
            )}
          </div>

          <div className="skill-index-row__side">
            <SkillOwnerThumbs
              owners={row.owners}
              displayMap={ownerDisplayMap}
              limit={5}
              linkable
              className="skill-index-row__owners"
            />

            {hasExpandableBody ? (
              <span className="skill-index-row__chevron" aria-hidden>
                <ChevronDown size={18} />
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {expanded && hasExpandableBody ? (
        <div className="skill-index-row__panel" onClick={(e) => e.stopPropagation()}>
          {incomplete.length > 0 ? (
            <div className="skill-index-row__incomplete">
              <p className="skill-index-row__incomplete-title">{site('skillIncompleteData')}</p>
              <ul>
                {incomplete.map((msg, i) => (
                  <li key={`${row.skillid}-inc-${i}`}>{msg}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {levelLines.length > 0 ? (
            <section className="skill-index-row__section">
              <h4 className="skill-index-row__section-title">
                {row.band === 'awaken' ? t(UI_KEYS.common.awakening) : t(UI_KEYS.common.effect)}
              </h4>
              <ol className="skill-index-row__levels">
                {levelLines.map((line) => {
                  const condition =
                    line.condition &&
                    !isNotAvailableLabel(line.condition, displayCopy.noDescription) &&
                    line.condition !== noData
                      ? line.condition
                      : undefined
                  return (
                    <li key={`${row.skillid}-lv-${line.level}`} className="skill-index-row__level">
                      <span className="skill-index-row__level-badge" aria-hidden>
                        {(() => {
                          const template = getT(UI_KEYS.common.heroLv)
                          return template.includes('{0}')
                            ? template.replace('{0}', String(line.level))
                            : `Lv.${line.level}`
                        })()}
                      </span>
                      <div className="skill-index-row__level-body">
                        {line.text ? (
                          <span dangerouslySetInnerHTML={{ __html: line.text }} />
                        ) : (
                          <span className="italic">{displayCopy.noDescription}</span>
                        )}
                        {condition ? (
                          <span className="skill-index-row__level-cond">({condition})</span>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          ) : null}

          {vm.subskillIds.length > 0 ? (
            <section className="skill-index-row__section">
              <h4 className="skill-index-row__section-title">{site('relatedSkills')}</h4>
              <ul className="skill-index-row__subskills">
                {vm.subskillIds.map((sid) => (
                  <li key={sid}>
                    <a href={`#skill-${sid}`} className="text-accent hover:underline">
                      #{sid}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

/** Scroll + expand helper for deep links (?open=id or #skill-id). */
export function useOpenSkillFromUrl(
  setExpandedId: (id: number | null) => void
) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const openParam = params.get('open')
    const hash = window.location.hash.replace(/^#skill-/, '')
    const raw = openParam || hash
    const id = Number(raw)
    if (!Number.isFinite(id) || id <= 0) return
    setExpandedId(id)
    requestAnimationFrame(() => {
      document.getElementById(`skill-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [setExpandedId])
}
