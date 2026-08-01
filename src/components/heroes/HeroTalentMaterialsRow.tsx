'use client'

import React, { useMemo } from 'react'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import HeroTalentConsumeList from './HeroTalentConsumeList'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

interface HeroTalentMaterialsRowProps {
  materials: ConsumeEntry[]
  cumulative: ConsumeEntry[]
  consumeRefMap: ConsumeRefMap
  materialsLabel?: string
}

function consumeKey(entry: ConsumeEntry): string {
  return `${entry.type ?? ''}:${entry.sid ?? 0}:${entry.num ?? 0}`
}

function consumeListsEqual(a: ConsumeEntry[], b: ConsumeEntry[]): boolean {
  if (a.length !== b.length) return false
  const left = [...a].map(consumeKey).sort()
  const right = [...b].map(consumeKey).sort()
  return left.every((key, i) => key === right[i])
}

export default function HeroTalentMaterialsRow({
  materials,
  cumulative,
  consumeRefMap,
  materialsLabel,
}: HeroTalentMaterialsRowProps) {
  const { t, site } = useUiTranslation()
  const materialsTitle = materialsLabel ?? t(UI_KEYS.common.materials)
  const cumulativeTitle = site('cumulativeTotal')

  const showCumulative = useMemo(() => {
    if (!cumulative.length) return false
    if (!materials.length) return true
    return !consumeListsEqual(materials, cumulative)
  }, [materials, cumulative])

  if (!materials.length && !cumulative.length) return null

  return (
    <div className="hero-talents-materials">
      {materials.length > 0 ? (
        <HeroTalentConsumeList
          items={materials}
          label={materialsTitle}
          consumeRefMap={consumeRefMap}
          compact
        />
      ) : null}

      {showCumulative ? (
        <HeroTalentConsumeList
          items={cumulative}
          label={cumulativeTitle}
          consumeRefMap={consumeRefMap}
          compact
        />
      ) : null}
    </div>
  )
}
