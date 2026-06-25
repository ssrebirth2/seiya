'use client'

import Link from 'next/link'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { ITEM_QUALITY_SHOW_TYPE } from '@/lib/game/item-quality-ui'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { resolveConsumeEntry } from '@/lib/game/resolve-consume-item'
import { SquareItem } from '@/components/game/SquareItem'
import { useLocalizedHref } from '@/lib/i18n/localized-href'

export type ConsumeEntityRowProps = {
  entry: ConsumeEntry
  consumeRefMap: ConsumeRefMap
  rateLabel?: string | null
  showQtyLine?: boolean
}

export function ConsumeEntityRow({
  entry,
  consumeRefMap,
  rateLabel,
  showQtyLine = true,
}: ConsumeEntityRowProps) {
  const localized = useLocalizedHref()
  const resolved = resolveConsumeEntry(entry, consumeRefMap, ITEM_QUALITY_SHOW_TYPE.small)

  return (
    <div className="consume-entity-row flex items-center gap-3 min-w-0">
      <SquareItem
        iconSrc={resolved.iconUrl}
        iconRawSrc={resolved.iconRawSrc}
        frameSrc={resolved.frameSrc}
        frameRawSrc={resolved.frameRawSrc}
        name={resolved.name}
        title={resolved.name}
        size="sm"
        showQuantity={false}
      />
      <div className="min-w-0 flex-1">
        {resolved.href ? (
          <Link
            href={localized(resolved.href)}
            className="text-sm font-medium truncate hover:text-accent"
            title={resolved.name}
          >
            {resolved.name}
          </Link>
        ) : (
          <div className="text-sm font-medium truncate" title={resolved.name}>
            {resolved.name}
          </div>
        )}
        {showQtyLine ? (
          <div className="text-xs text-text-muted tabular-nums">×{entry.num.toLocaleString()}</div>
        ) : null}
        {rateLabel ? <div className="text-xs text-text-muted">{rateLabel}</div> : null}
      </div>
    </div>
  )
}

export default ConsumeEntityRow
