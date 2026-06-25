'use client'

import Link from 'next/link'
import GameImage from '@/components/ui/GameImage'
import { ITEM_QUALITY_SHOW_TYPE, type ItemQualityShowType, type ItemUiDisplayMode } from '@/lib/game/item-quality-ui'
import { useLocalizedHref } from '@/lib/i18n/localized-href'

export type SquareItemSize = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<SquareItemSize, string> = {
  sm: 'square-item--sm',
  md: 'square-item--md',
  lg: 'square-item--lg',
}

export type SquareItemProps = {
  iconSrc: string
  iconRawSrc?: string
  frameSrc?: string | null
  frameRawSrc?: string | null
  quantity?: number
  name?: string
  size?: SquareItemSize
  showType?: ItemQualityShowType
  showQuantity?: boolean
  /** `reference` = 50% (consume/materials). `native` = full game size (item catalog). */
  displayMode?: ItemUiDisplayMode
  href?: string
  title?: string
  className?: string
  onClick?: () => void
}

/**
 * `displayMode="reference"` (default) — 50% for consume/material chips.
 * `displayMode="native"` — full size for item catalog listing.
 */
export function SquareItem({
  iconSrc,
  iconRawSrc,
  frameSrc,
  frameRawSrc,
  quantity,
  name,
  size = 'sm',
  showType = ITEM_QUALITY_SHOW_TYPE.small,
  showQuantity = quantity != null && quantity > 0,
  displayMode = 'reference',
  href,
  title,
  className = '',
  onClick,
}: SquareItemProps) {
  const localized = useLocalizedHref()
  const showTypeClass =
    showType === ITEM_QUALITY_SHOW_TYPE.large ? 'square-item--show-large' : 'square-item--show-small'
  const alt = name || title || ''
  const tooltip = title ?? name

  const frame = (
    <div
      className={`square-item ${SIZE_CLASS[size]} ${showTypeClass}`.trim()}
      title={!showQuantity ? tooltip : undefined}
    >
      {frameSrc ? (
        <GameImage
          src={frameSrc}
          rawSrc={frameRawSrc ?? frameSrc}
          alt=""
          aria-hidden
          className="square-item__frame"
        />
      ) : null}
      <div className="square-item__icon-wrap">
        <GameImage
          src={iconSrc}
          rawSrc={iconRawSrc ?? iconSrc}
          alt={alt}
          className="square-item__icon"
        />
      </div>
    </div>
  )

  const displayModeClass =
    displayMode === 'native' ? 'square-item-slot--native' : 'square-item-slot--reference'

  const body = (
    <div
      className={`square-item-slot ${displayModeClass} ${className}`.trim()}
      title={tooltip}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {frame}
      {showQuantity ? (
        <span className="square-item__qty tabular-nums" aria-label={quantity != null ? `×${quantity}` : undefined}>
          {quantity}
        </span>
      ) : null}
    </div>
  )

  if (href) {
    return (
      <Link href={localized(href)} className="square-item-link inline-block">
        {body}
      </Link>
    )
  }

  return body
}
