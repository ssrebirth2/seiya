'use client'

import React from 'react'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { ConsumeList } from '@/components/game/ConsumeList'

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
  return (
    <ConsumeList
      items={items}
      consumeRefMap={consumeRefMap}
      label={label}
      compact={compact}
    />
  )
}
