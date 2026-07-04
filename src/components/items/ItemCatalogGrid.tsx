'use client'

import Link from 'next/link'
import { SquareItem } from '@/components/game/SquareItem'
import type { ItemCatalogIndexRow } from '@/lib/game/item-catalog'
import { ITEM_QUALITY_SHOW_TYPE, resolveItemQualityFramePath } from '@/lib/game/item-quality-ui'
import { itemIconUrl } from '@/lib/game/resolve-item-icon'
import { fetchItemDetail } from '@/lib/query/fetchers/item-detail'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'
import { getQueryClient } from '@/lib/query/query-client'
import { queryKeys } from '@/lib/query/query-keys'
import { useLocalizedHref } from '@/lib/i18n/localized-href'

type ItemCatalogGridProps = {
  items: ItemCatalogIndexRow[]
  getItemName: (item: ItemCatalogIndexRow) => string
  lang: string
}

function prefetchItemDetail(itemId: number, lang: string) {
  const qc = getQueryClient()
  void qc.prefetchQuery({
    queryKey: queryKeys.itemDetail(itemId, lang),
    queryFn: () => fetchItemDetail(itemId, lang),
    staleTime: GAME_CONFIG_STALE_MS,
  })
}

export function ItemCatalogGrid({ items, getItemName, lang }: ItemCatalogGridProps) {
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
            onMouseEnter={() => prefetchItemDetail(it.id, lang)}
            onFocus={() => prefetchItemDetail(it.id, lang)}
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
