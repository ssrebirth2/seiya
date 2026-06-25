'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import GameImage from '@/components/ui/GameImage'
import { resolveForceCardListIcon } from '@/lib/assets/game-images'
import { squareDynamisArtStyle } from '@/lib/game/ui-layout'
import { ForceCardRestrictionChips } from '@/components/force-cards/ForceCardRestrictionChips'
import type { ForceCardRestrictionChip } from '@/lib/game/force-card-equip'

export type SquareDynamisItemProps = {
  cardId: number
  hasSmallIcon?: boolean
  name?: ReactNode
  showName?: boolean
  restrictionChips?: ForceCardRestrictionChip[]
  getT?: (key?: string) => string
  href?: string
  className?: string
  onClick?: () => void
}

/** Force card tile — portrait only (no item-quality frame; those belong on SquareItem consumes). */
export function SquareDynamisItem({
  cardId,
  hasSmallIcon = true,
  name,
  showName = true,
  restrictionChips,
  getT,
  href,
  className = '',
  onClick,
}: SquareDynamisItemProps) {
  const portrait = resolveForceCardListIcon(cardId, hasSmallIcon)

  const content = (
    <div className={`square-dynamis-item ${className}`.trim()}>
      <div className="square-dynamis-item__art" style={squareDynamisArtStyle()}>
        <GameImage
          src={portrait.src}
          rawSrc={portrait.rawSrc}
          alt=""
          className="square-dynamis-item__portrait"
        />

        {restrictionChips?.length && getT ? (
          <div className="square-dynamis-item__restrictions">
            <ForceCardRestrictionChips chips={restrictionChips} getT={getT} compact />
          </div>
        ) : null}
      </div>

      {showName && name ? <div className="square-dynamis-item__name">{name}</div> : null}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="square-dynamis-item-link" onClick={onClick}>
        {content}
      </Link>
    )
  }

  return content
}
