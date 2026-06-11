'use client'

import React from 'react'
import GameImage from '@/components/ui/GameImage'
import { consumeRefKey, type ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { FALLBACK_ITEM_ICON } from '@/lib/game/resolve-item-icon'

import { TALENT_ICON_CLASS } from '@/lib/assets/talent-images'

interface HeroTalentConsumeListProps {
  items: ConsumeEntry[]
  label?: string
  consumeRefMap: ConsumeRefMap
  compact?: boolean
}

export default function HeroTalentConsumeList({
  items,
  label,
  consumeRefMap,
  compact = false,
}: HeroTalentConsumeListProps) {
  if (!items.length) return null

  return (
    <div className={compact ? '' : 'mt-2'}>
      {label && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      )}
      <ul className="flex flex-wrap gap-3 sm:gap-4">
        {items.map((item, i) => {
          const ref = consumeRefMap[consumeRefKey(item)]
          const name = ref?.name ?? (item.sid ? `#${item.sid}` : item.type || 'Unknown')
          const icon = ref?.iconUrl ?? FALLBACK_ITEM_ICON

          return (
            <li
              key={`${item.sid}-${item.type}-${i}`}
              className="flex flex-col items-center gap-0.5"
              title={name}
            >
              <GameImage
                src={icon}
                rawSrc={icon}
                alt={name}
                className={TALENT_ICON_CLASS}
              />
              <span className="text-xs font-semibold tabular-nums text-text sm:text-sm">
                ×{item.num}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
