'use client'

import React, { useEffect, useState } from 'react'
import { setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import { cumulativeAwakeningMaterials } from '@/lib/game/aggregate-consume'
import { createTranslationGetter } from '@/lib/i18n/language-package'
import { useHeroTalents } from '@/hooks/use-hero-talents'
import HeroTalentLayer from './HeroTalentLayer'

interface HeroTalentsProps {
  heroId: number
}

export default function HeroTalents({ heroId }: HeroTalentsProps) {
  const { data: bundle, isLoading, isFetching, isError } = useHeroTalents(heroId)
  const [activeLayer, setActiveLayer] = useState(0)
  const isRetranslating = isFetching && !isLoading

  useEffect(() => {
    setupGlobalSkillTooltips()
  }, [])

  useEffect(() => {
    setActiveLayer(0)
  }, [heroId])

  if (isLoading) {
    return (
      <section className="mt-2 flex justify-center py-8 sm:mt-4">
        <div className="spinner h-8 w-8" />
      </section>
    )
  }

  if (isError || !bundle?.data.layers.length) {
    return <p className="text-sm text-text-muted">No talents found for this hero.</p>
  }

  const { data, translations, valuesMap, labelMap, consumeRefMap } = bundle
  const getT = createTranslationGetter(translations)

  const layerLabel = (index: number) => {
    const template = getT('LC_hero_giftness_tag')
    return template.includes('{0}') ? template.replace('{0}', String(index)) : `Layer ${index}`
  }

  return (
    <section className={isRetranslating ? 'i18n-content--pending' : undefined}>
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Talent layers"
      >
        {data.layers.map((layer, idx) => {
          const isActive = idx === activeLayer
          return (
            <button
              key={layer.layerId}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveLayer(idx)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                isActive
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-panel-border bg-panel hover:bg-panel-hover'
              }`}
            >
              {layerLabel(layer.index)}
            </button>
          )
        })}
      </div>

      {data.layers.map((layer, idx) => (
        <div
          key={layer.layerId}
          role="tabpanel"
          aria-hidden={idx !== activeLayer}
          className={idx === activeLayer ? 'block' : 'hidden'}
        >
          <HeroTalentLayer
            layer={layer}
            cumulativeAwakeningMaterials={cumulativeAwakeningMaterials(data.layers, idx)}
            visibleStats={data.visibleStats}
            getT={getT}
            valuesMap={valuesMap}
            labelMap={labelMap}
            consumeRefMap={consumeRefMap}
          />
        </div>
      ))}
    </section>
  )
}
