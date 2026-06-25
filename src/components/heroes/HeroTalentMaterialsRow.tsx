'use client'

import React from 'react'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import HeroTalentConsumeList from './HeroTalentConsumeList'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

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
  const { t } = useUiTranslation()

  if (!materials.length && !cumulative.length) return null

  return (
    <div className="mt-4 grid grid-cols-2 items-start gap-x-6">
      <div className="min-w-0">
        {materials.length > 0 ? (
          <HeroTalentConsumeList
            items={materials}
            label={t(UI_KEYS.common.materials)}
            consumeRefMap={consumeRefMap}
          />
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t(UI_KEYS.common.materials)}
            </p>
            <span className="text-sm text-text-muted">—</span>
          </>
        )}
      </div>
      <div className="min-w-0">
        {cumulative.length > 0 ? (
          <HeroTalentConsumeList
            items={cumulative}
            label={t(UI_KEYS.item.cumulativeTotal)}
            consumeRefMap={consumeRefMap}
          />
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t(UI_KEYS.item.cumulativeTotal)}
            </p>
            <span className="text-sm text-text-muted">—</span>
          </>
        )}
      </div>
    </div>
  )
}
