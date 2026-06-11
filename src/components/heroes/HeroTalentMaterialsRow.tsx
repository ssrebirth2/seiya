'use client'

import React from 'react'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import HeroTalentConsumeList from './HeroTalentConsumeList'

interface HeroTalentMaterialsRowProps {
  materials: ConsumeEntry[]
  cumulative: ConsumeEntry[]
  consumeRefMap: ConsumeRefMap
}

export default function HeroTalentMaterialsRow({
  materials,
  cumulative,
  consumeRefMap,
}: HeroTalentMaterialsRowProps) {
  if (!materials.length && !cumulative.length) return null

  return (
    <div className="mt-4 grid grid-cols-2 items-start gap-x-6">
      <div className="min-w-0">
        {materials.length > 0 ? (
          <HeroTalentConsumeList items={materials} label="Materials" consumeRefMap={consumeRefMap} />
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Materials
            </p>
            <span className="text-sm text-text-muted">—</span>
          </>
        )}
      </div>
      <div className="min-w-0">
        {cumulative.length > 0 ? (
          <HeroTalentConsumeList items={cumulative} label="Total" consumeRefMap={consumeRefMap} />
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Total
            </p>
            <span className="text-sm text-text-muted">—</span>
          </>
        )}
      </div>
    </div>
  )
}
