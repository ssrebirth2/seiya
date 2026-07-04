'use client'

import Link from 'next/link'
import { SquareItem } from '@/components/game/SquareItem'
import type { BoxAwardEntry } from '@/lib/game/item-business'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { ITEM_QUALITY_SHOW_TYPE } from '@/lib/game/item-quality-ui'
import { resolveConsumeEntry } from '@/lib/game/resolve-consume-item'
import { useLocalizedHref } from '@/lib/i18n/localized-href'

type ItemBoxRewardsGridProps = {
  entries: BoxAwardEntry[]
  consumeRefMap: ConsumeRefMap
}

export function ItemBoxRewardsGrid({ entries, consumeRefMap }: ItemBoxRewardsGridProps) {
  const localized = useLocalizedHref()

  if (!entries.length) return null

  return (
    <ul className="item-detail-rewards-grid" role="list">
      {entries.map((entry, i) => {
        const resolved = resolveConsumeEntry(entry.award, consumeRefMap, ITEM_QUALITY_SHOW_TYPE.small)
        const href = resolved.href ? localized(resolved.href) : null

        return (
          <li
            key={`${entry.award.sid}-${entry.award.type}-${i}`}
            className={`item-detail-rewards-grid__cell${
              entry.rateLabel ? ' item-detail-rewards-grid__cell--rated' : ''
            }`}
          >
            <div className="item-detail-rewards-grid__icon-wrap">
              {entry.rateLabel ? (
                <span className="item-detail-rewards-grid__rate-badge">{entry.rateLabel}</span>
              ) : null}
              <SquareItem
                iconSrc={resolved.iconUrl}
                iconRawSrc={resolved.iconRawSrc}
                frameSrc={resolved.frameSrc}
                frameRawSrc={resolved.frameRawSrc}
                quantity={entry.award.num}
                name={resolved.name}
                title={resolved.name}
                href={href ?? undefined}
                size="sm"
                showQuantity
              />
            </div>
            <p className="item-detail-rewards-grid__name" title={resolved.name}>
              {href ? (
                <Link href={href} className="hover:text-accent">
                  {resolved.name}
                </Link>
              ) : (
                resolved.name
              )}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
