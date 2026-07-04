'use client'

import Link from 'next/link'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { ITEM_QUALITY_SHOW_TYPE } from '@/lib/game/item-quality-ui'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { resolveConsumeEntry } from '@/lib/game/resolve-consume-item'
import { SquareItem } from '@/components/game/SquareItem'
import { useLocalizedHref } from '@/lib/i18n/localized-href'

export type ConsumeListProps = {
  items: ConsumeEntry[]
  consumeRefMap: ConsumeRefMap
  label?: string
  compact?: boolean
  layout?: 'row' | 'grid' | 'rewards'
  className?: string
}

export function ConsumeList({
  items,
  consumeRefMap,
  label,
  compact = false,
  layout = 'row',
  className = '',
}: ConsumeListProps) {
  const localized = useLocalizedHref()

  if (!items.length) return null

  if (layout === 'rewards') {
    return (
      <ul className={`item-detail-rewards-grid ${className}`.trim()} role="list">
        {items.map((item, i) => {
          const resolved = resolveConsumeEntry(item, consumeRefMap, ITEM_QUALITY_SHOW_TYPE.small)
          const href = resolved.href ? localized(resolved.href) : null
          return (
            <li key={`${item.sid}-${item.type}-${i}`} className="item-detail-rewards-grid__cell">
              <SquareItem
                iconSrc={resolved.iconUrl}
                iconRawSrc={resolved.iconRawSrc}
                frameSrc={resolved.frameSrc}
                frameRawSrc={resolved.frameRawSrc}
                quantity={item.num}
                name={resolved.name}
                title={resolved.name}
                href={href ?? undefined}
                size="sm"
                showQuantity
              />
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

  return (
    <div className={compact ? className : `mt-2 ${className}`.trim()}>
      {label ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      ) : null}
      <ul
        className={
          layout === 'grid'
            ? 'grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3'
            : 'flex flex-wrap gap-3 sm:gap-4'
        }
        role="list"
      >
        {items.map((item, i) => {
          const resolved = resolveConsumeEntry(item, consumeRefMap, ITEM_QUALITY_SHOW_TYPE.small)
          return (
            <li
              key={`${item.sid}-${item.type}-${i}`}
              className="flex flex-col items-center gap-0.5"
            >
              <SquareItem
                iconSrc={resolved.iconUrl}
                iconRawSrc={resolved.iconRawSrc}
                frameSrc={resolved.frameSrc}
                frameRawSrc={resolved.frameRawSrc}
                quantity={item.num}
                name={resolved.name}
                title={resolved.name}
                href={resolved.href}
                size="sm"
                showQuantity
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default ConsumeList
