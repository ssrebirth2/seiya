'use client'

import { useState } from 'react'
import { useLanguage } from '@/context/language-context'
import { createTranslationGetter } from '@/lib/i18n/language-package'
import type { HeroCosmoBundle } from '@/lib/game/cosmo-types'
import HeroCosmoSenseSummary from './HeroCosmoSenseSummary'

type Props = {
  bundle: HeroCosmoBundle
}

export default function HeroCosmoSenseTabs({ bundle }: Props) {
  const { lang } = useLanguage()
  const { data } = bundle
  const getT = createTranslationGetter(bundle.translations, { lang })
  const [activeSense, setActiveSense] = useState(0)
  const sense = data.senses[activeSense]

  if (!sense) return null

  return (
    <section className="space-y-4">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={getT('LC_COSMO_sense_value_with_space')}
      >
        {data.senses.map((s, idx) => {
          const label = getT(data.senseLabelKeys[idx] ?? '')
          const isActive = idx === activeSense
          return (
            <button
              key={s.domainId}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveSense(idx)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                isActive
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-panel-border bg-panel hover:bg-panel-hover'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <HeroCosmoSenseSummary sense={sense} bundle={bundle} />
    </section>
  )
}
