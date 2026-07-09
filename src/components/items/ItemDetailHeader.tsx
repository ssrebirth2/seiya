'use client'

import { SquareItem } from '@/components/game/SquareItem'
import type { ItemConfigRow } from '@/lib/game/load-item-detail'
import { ITEM_QUALITY_SHOW_TYPE, resolveItemQualityFramePath } from '@/lib/game/item-quality-ui'
import { itemIconUrl } from '@/lib/game/resolve-item-icon'

type ItemDetailHeaderProps = {
  item: ItemConfigRow
  resolvedName: string
  resolvedDescHtml?: string
}

export function ItemDetailHeader({
  item,
  resolvedName,
  resolvedDescHtml,
}: ItemDetailHeaderProps) {
  const largeFrame =
    item.quality > 0 ? resolveItemQualityFramePath(ITEM_QUALITY_SHOW_TYPE.large, item.quality) : null

  return (
    <section className="surface panel force-card-detail-header">
      <div className="force-card-detail-header__layout">
        <div className="force-card-detail-header__art item-detail-header__art flex justify-center">
          <SquareItem
            iconSrc={itemIconUrl(item.icon_path)}
            frameSrc={largeFrame?.src}
            frameRawSrc={largeFrame?.rawSrc}
            name={resolvedName}
            size="lg"
            showType={ITEM_QUALITY_SHOW_TYPE.large}
            showQuantity={false}
            displayMode="native"
          />
        </div>

        <div className="force-card-detail-header__body">
          <div className="force-card-detail-header__meta">
            <span className="text-xs text-text-muted">ID {item.id}</span>
          </div>

          <h1 className="force-card-detail-header__title">{resolvedName}</h1>

          {resolvedDescHtml ? (
            <div
              className="force-card-detail-header__story-text mt-3"
              dangerouslySetInnerHTML={{ __html: resolvedDescHtml }}
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}
