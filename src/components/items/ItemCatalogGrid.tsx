'use client'

import Link from 'next/link'
import { SquareItem } from '@/components/game/SquareItem'
import type { ItemCatalogIndexRow } from '@/lib/game/item-catalog'
import { ITEM_QUALITY_SHOW_TYPE, resolveItemQualityFramePath } from '@/lib/game/item-quality-ui'
import { itemIconUrl } from '@/lib/game/resolve-item-icon'
import { useLocalizedHref } from '@/lib/i18n/localized-href'

type ItemCatalogGridProps = {
  items: ItemCatalogIndexRow[]
  getItemName: (item: ItemCatalogIndexRow) => string
}

export function ItemCatalogGrid({ items, getItemName }: ItemCatalogGridProps) {
  const localized = useLocalizedHref()
  if (!items.length) return null

  return (
    <div className="item-catalog-grid">
      {items.map((it) => {
        const frame =
          it.quality > 0 ? resolveItemQualityFramePath(ITEM_QUALITY_SHOW_TYPE.small, it.quality) : null
        const displayName = getItemName(it)

        return (
          <Link
            key={it.id}
            href={localized(`/items/${it.id}`)}
            className="item-catalog-cell"
            title={displayName}
          >
            <SquareItem
              iconSrc={itemIconUrl(it.icon_path)}
              frameSrc={frame?.src}
              frameRawSrc={frame?.rawSrc}
              name={displayName}
              size="sm"
              showType={ITEM_QUALITY_SHOW_TYPE.small}
              showQuantity={false}
              displayMode="native"
            />
            <span className="item-catalog-cell__name">{displayName}</span>
          </Link>
        )
      })}
    </div>
  )
}

export default ItemCatalogGrid
