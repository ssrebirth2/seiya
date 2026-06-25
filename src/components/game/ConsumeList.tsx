'use client'

import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { ITEM_QUALITY_SHOW_TYPE } from '@/lib/game/item-quality-ui'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { resolveConsumeEntry } from '@/lib/game/resolve-consume-item'
import { SquareItem } from '@/components/game/SquareItem'

export type ConsumeListProps = {
  items: ConsumeEntry[]
  consumeRefMap: ConsumeRefMap
  label?: string
  compact?: boolean
  layout?: 'row' | 'grid'
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
  if (!items.length) return null

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
