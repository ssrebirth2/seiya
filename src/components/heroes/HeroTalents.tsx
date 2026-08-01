'use client'

import React, { useEffect, useState } from 'react'
import { setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import { cumulativeAwakeningMaterials } from '@/lib/game/aggregate-consume'
import { createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { LoadingSkeleton, EmptyState } from '@/components/ui/v2'
import { useHeroTalents } from '@/hooks/use-hero-talents'
import HeroTalentLayer from './HeroTalentLayer'

interface HeroTalentsProps {
  heroId: number
}

export default function HeroTalents({ heroId }: HeroTalentsProps) {
  const { t } = useUiTranslation()
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
      <section className="hero-talents-root hero-talents-root--loading">
        <LoadingSkeleton variant="detail" />
      </section>
    )
  }

  if (isError || !bundle?.data.layers.length) {
    return <EmptyState message={t(UI_KEYS.common.noData)} />
  }

  const { data, translations, valuesMap, labelMap, consumeRefMap } = bundle
  const getT = createTranslationGetter(translations)

  const layerLabel = (index: number) => {
    const template = getT(UI_KEYS.hero.talentLayerTag)
    return template.includes('{0}') ? template.replace('{0}', String(index)) : template
  }

  return (
    <section className={`hero-talents-root${isRetranslating ? ' i18n-content--pending' : ''}`}>
      <div
        className="hero-talents-layers"
        role="tablist"
        aria-label={getT(UI_KEYS.hero.talentsTab)}
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
              className={`hero-talents-chip${isActive ? ' hero-talents-chip--active' : ''}`}
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
