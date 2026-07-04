'use client'

import Link from 'next/link'
import { SquareItem } from '@/components/game/SquareItem'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { ITEM_QUALITY_SHOW_TYPE } from '@/lib/game/item-quality-ui'
import type { ItemRewardSourceEntry } from '@/lib/game/load-item-usage'
import { resolveConsumeEntry } from '@/lib/game/resolve-consume-item'
import { useLocalizedHref } from '@/lib/i18n/localized-href'

type ItemRewardSourcesSectionProps = {
  entries: ItemRewardSourceEntry[]
  consumeRefMap: ConsumeRefMap
}

export function ItemRewardSourcesSection({
  entries,
  consumeRefMap,
}: ItemRewardSourcesSectionProps) {
  const localized = useLocalizedHref()

  if (!entries.length) return null

  return (
    <ul className="item-detail-rewards-grid" role="list">
      {entries.map((entry) => {
        const award = {
          type: 'prop' as const,
          sid: entry.sourceItemId,
          num: entry.qty ?? 1,
        }
        const resolved = resolveConsumeEntry(award, consumeRefMap, ITEM_QUALITY_SHOW_TYPE.small)
        const href = localized(`/items/${entry.sourceItemId}`)

        return (
          <li key={entry.id} className="item-detail-rewards-grid__cell">
            <SquareItem
              iconSrc={resolved.iconUrl}
              iconRawSrc={resolved.iconRawSrc}
              frameSrc={resolved.frameSrc}
              frameRawSrc={resolved.frameRawSrc}
              name={resolved.name}
              title={resolved.name}
              href={href}
              size="sm"
              showQuantity={false}
            />
            <p className="item-detail-rewards-grid__name" title={resolved.name}>
              <Link href={href} className="hover:text-accent">
                {resolved.name}
              </Link>
            </p>
          </li>
        )
      })}
    </ul>
  )
}
