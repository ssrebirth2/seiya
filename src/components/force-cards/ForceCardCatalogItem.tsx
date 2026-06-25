'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { SquareDynamisItem } from '@/components/force-cards/SquareDynamisItem'
import type { ForceCardRestrictionChip } from '@/lib/game/force-card-equip'
import { useLocalizedHref } from '@/lib/i18n/localized-href'

type ForceCardCatalogItemProps = {
  cardId: number
  hasSmallIcon?: boolean
  name: ReactNode
  href: string
  restrictionChips?: ForceCardRestrictionChip[]
  getT: (key?: string) => string
}

export function ForceCardCatalogItem({
  cardId,
  hasSmallIcon,
  name,
  href,
  restrictionChips,
  getT,
}: ForceCardCatalogItemProps) {
  const localized = useLocalizedHref()

  return (
    <div className="force-card-catalog-item group">
      <SquareDynamisItem
        cardId={cardId}
        hasSmallIcon={hasSmallIcon}
        name={name}
        href={localized(href)}
        restrictionChips={restrictionChips}
        getT={getT}
        className="force-card-catalog-item__tile"
      />
    </div>
  )
}
