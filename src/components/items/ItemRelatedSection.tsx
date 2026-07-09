'use client'

import Link from 'next/link'
import { SquareItem } from '@/components/game/SquareItem'
import type { RelatedItemEntry } from '@/lib/game/load-item-related'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { ITEM_QUALITY_SHOW_TYPE, resolveItemQualityFramePath } from '@/lib/game/item-quality-ui'
import { itemIconUrl } from '@/lib/game/resolve-item-icon'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { useLocalizedHref } from '@/lib/i18n/localized-href'

type ItemRelatedSectionProps = {
  relatedItems: RelatedItemEntry[]
  consumeRefMap: ConsumeRefMap
  getT: (key?: string) => string
  embedded?: boolean
}

const RELATION_LABEL_KEYS: Record<string, string> = {
  LC_COMMON_compose: UI_KEYS.item.compose,
  LC_COMMON_compose_fragment: UI_KEYS.item.composeFragment,
  LC_ITEM_box_award_tip2: UI_KEYS.item.boxAwardRandom,
}

function relationLabel(labelKey: string | undefined, t: (key: string) => string, getT: (key?: string) => string) {
  if (!labelKey) return null
  const uiKey = RELATION_LABEL_KEYS[labelKey]
  return uiKey ? t(uiKey) : getT(labelKey)
}

export function ItemRelatedSection({
  relatedItems,
  consumeRefMap,
  getT,
  embedded = false,
}: ItemRelatedSectionProps) {
  const { t } = useUiTranslation()
  const localized = useLocalizedHref()

  if (!relatedItems.length) return null

  const strip = (
    <div className="item-detail-box-strip">
      {relatedItems.map((rel) => {
        const ref = consumeRefMap[String(rel.id)]
        const name = ref?.name ?? `#${rel.id}`
        const frame =
          ref?.quality && ref.quality > 0
            ? resolveItemQualityFramePath(ITEM_QUALITY_SHOW_TYPE.small, ref.quality)
            : null
        const subtitle = relationLabel(rel.labelKey, t, getT)
        return (
          <Link
            key={`${rel.relation}-${rel.id}`}
            href={localized(`/items/${rel.id}`)}
            className="item-detail-related-cell"
            title={name}
          >
            <SquareItem
              iconSrc={ref?.iconUrl ?? itemIconUrl(ref?.iconPath)}
              frameSrc={frame?.src}
              frameRawSrc={frame?.rawSrc}
              name={name}
              size="sm"
              showType={ITEM_QUALITY_SHOW_TYPE.small}
              showQuantity={false}
            />
            <span className="item-detail-related-cell__name">{name}</span>
            {subtitle ? <span className="text-xs text-text-muted">{subtitle}</span> : null}
          </Link>
        )
      })}
    </div>
  )

  if (embedded) return strip

  return (
    <section className="item-detail-section">
      <h2 className="item-detail-section__title">{t(UI_KEYS.common.preview)}</h2>
      {strip}
    </section>
  )
}
