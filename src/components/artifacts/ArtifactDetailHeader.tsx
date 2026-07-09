'use client'

import ArtifactPreviewImage from '@/components/ui/ArtifactPreviewImage'
import { QualityBadge } from '@/components/ui/v2'
import { ForceCardRestrictionChips } from '@/components/force-cards/ForceCardRestrictionChips'
import type { ForceCardRestrictionChip } from '@/lib/game/force-card-equip'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type ArtifactDetailHeaderProps = {
  artifactId: number
  /** PropQuality from DB (initial_quality) for badge colors — GameDefine.ArtifactQualityString. */
  badgeQuality?: number
  name: string
  previewIconPath?: string | null
  storyHtml?: string
  tagLabels?: string[]
  campLabel?: string
  restrictionChips?: ForceCardRestrictionChip[]
  getT: (key?: string) => string
}

export function ArtifactDetailHeader({
  artifactId,
  badgeQuality,
  name,
  previewIconPath,
  storyHtml,
  tagLabels = [],
  campLabel,
  restrictionChips = [],
  getT,
}: ArtifactDetailHeaderProps) {
  const { t, site } = useUiTranslation()
  const hasTags = tagLabels.length > 0
  const hasFaction = Boolean(campLabel)
  const hasRestrictions = restrictionChips.length > 0

  return (
    <section className="surface panel force-card-detail-header artifact-detail-header">
      <div className="force-card-detail-header__layout">
        <div className="artifact-detail-header__art-showcase">
          <ArtifactPreviewImage
            artifactId={artifactId}
            dbPreviewPath={previewIconPath}
            alt={name}
            className="artifact-detail-header__art-image"
            loading="eager"
            decoding="async"
            width={512}
            height={512}
            sizes="(min-width: 768px) 320px, 78vw"
          />
        </div>

        <div className="force-card-detail-header__body">
          <div className="force-card-detail-header__meta">
            {badgeQuality != null && badgeQuality > 0 ? (
              <QualityBadge quality={badgeQuality} variant="artifact" className="text-sm" />
            ) : null}
            <span className="text-xs text-text-muted">ID {artifactId}</span>
          </div>

          <h1 className="force-card-detail-header__title">{name}</h1>

          {hasTags ? (
            <div className="artifact-detail-header__section artifact-detail-header__tags">
              <p className="force-card-detail-header__section-label">{site('tags')}</p>
              <div className="skill-detail-card__chips" role="list">
                {tagLabels.map((label) => (
                  <span key={label} className="skill-detail-card__chip" role="listitem">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {hasFaction ? (
            <div className="artifact-detail-header__section artifact-detail-header__faction">
              <p className="force-card-detail-header__section-label">
                {t(UI_KEYS.filter.faction)}
              </p>
              <div className="skill-detail-card__chips" role="list">
                <span className="skill-detail-card__chip" role="listitem">
                  {campLabel}
                </span>
              </div>
            </div>
          ) : null}

          {hasRestrictions ? (
            <div className="artifact-detail-header__section force-card-detail-header__restrictions">
              <p className="force-card-detail-header__section-label">
                {t(UI_KEYS.artifact.restriction)}
              </p>
              <ForceCardRestrictionChips
                chips={restrictionChips}
                getT={getT}
                showLabels
                borderless
              />
            </div>
          ) : null}

          {storyHtml ? (
            <div className="artifact-detail-header__section force-card-detail-header__story">
              <p className="force-card-detail-header__section-label">
                {t(UI_KEYS.artifact.relicIntro)}
              </p>
              <div
                className="force-card-detail-header__story-text whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: storyHtml }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default ArtifactDetailHeader
