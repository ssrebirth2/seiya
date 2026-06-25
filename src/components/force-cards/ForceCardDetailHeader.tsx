'use client'

import ForceCardImage from '@/components/ui/ForceCardImage'
import { QualityBadge } from '@/components/ui/v2'
import { ForceCardRestrictionChips } from '@/components/force-cards/ForceCardRestrictionChips'
import type { ForceCardRestrictionChip } from '@/lib/game/force-card-equip'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type ForceCardDetailHeaderProps = {
  cardId: number
  quality?: number
  name: string
  storyHtml?: string
  restrictionChips?: ForceCardRestrictionChip[]
  getT: (key?: string) => string
}

export function ForceCardDetailHeader({
  cardId,
  quality,
  name,
  storyHtml,
  restrictionChips = [],
  getT,
}: ForceCardDetailHeaderProps) {
  const { t } = useUiTranslation()
  const hasRestrictions = restrictionChips.length > 0

  return (
    <section className="surface panel force-card-detail-header">
      <div className="force-card-detail-header__layout">
        <ForceCardImage
          cardId={cardId}
          quality={quality}
          alt={name}
          className="force-card-detail-header__art"
        />

        <div className="force-card-detail-header__body">
          <div className="force-card-detail-header__meta">
            {quality != null ? <QualityBadge quality={quality} variant="force-card" /> : null}
            <span className="text-xs text-text-muted">ID {cardId}</span>
          </div>

          <h1 className="force-card-detail-header__title">{name}</h1>

          {hasRestrictions ? (
            <div className="force-card-detail-header__restrictions">
              <p className="force-card-detail-header__section-label">
                {t(UI_KEYS.forceCard.restriction)}
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
            <div className="force-card-detail-header__story">
              <p className="force-card-detail-header__section-label">
                {t(UI_KEYS.forceCard.story)}
              </p>
              <div
                className="force-card-detail-header__story-text"
                dangerouslySetInnerHTML={{ __html: storyHtml }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
