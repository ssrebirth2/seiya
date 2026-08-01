'use client'

import { useEffect } from 'react'
import { setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import { useHeroCosmo } from '@/hooks/use-hero-cosmo'
import { LoadingSkeleton, EmptyState } from '@/components/ui/v2'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import HeroCosmoHeader from './cosmo/HeroCosmoHeader'
import HeroCosmoPassives from './cosmo/HeroCosmoPassives'
import HeroCosmoSenseTabs from './cosmo/HeroCosmoSenseTabs'

interface HeroCosmoProps {
  heroId: number
}

export default function HeroCosmo({ heroId }: HeroCosmoProps) {
  const { t } = useUiTranslation()
  const { data: bundle, isLoading, isError, isFetching } = useHeroCosmo(heroId)
  const isRetranslating = isFetching && !isLoading

  useEffect(() => {
    setupGlobalSkillTooltips()
  }, [])

  if (isLoading) {
    return (
      <section className="py-8">
        <LoadingSkeleton variant="detail" />
      </section>
    )
  }

  if (isError || !bundle) {
    return <EmptyState message={t(UI_KEYS.common.noData)} />
  }

  return (
    <section className={`space-y-6 ${isRetranslating ? 'i18n-content--pending' : ''}`}>
      <HeroCosmoHeader data={bundle.data} translations={bundle.translations} />
      <HeroCosmoPassives
        data={bundle.data}
        translations={bundle.translations}
        valuesMap={bundle.valuesMap}
        labelMap={bundle.labelMap}
        skillMap={bundle.skillMap}
      />
      <HeroCosmoSenseTabs bundle={bundle} />
    </section>
  )
}
