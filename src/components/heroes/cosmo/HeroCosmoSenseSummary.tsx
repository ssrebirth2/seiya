'use client'

import HeroTalentConsumeList from '@/components/heroes/HeroTalentConsumeList'
import { useLanguage } from '@/context/language-context'
import { aggregateConsume } from '@/lib/game/aggregate-consume'
import { aggregateCosmoStats } from '@/lib/game/aggregate-cosmo-stats'
import { formatGroupedCosmoAttributeLines } from '@/lib/game/format-cosmo-attribute'
import { formatCosmoDomainUnlockLines } from '@/lib/game/format-cosmo-unlock'
import type { CosmoSenseData, HeroCosmoBundle } from '@/lib/game/cosmo-types'
import { createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS } from '@/lib/i18n/ui-keys'

type Props = {
  sense: CosmoSenseData
  bundle: HeroCosmoBundle
}

export default function HeroCosmoSenseSummary({ sense, bundle }: Props) {
  const { lang } = useLanguage()
  const { data } = bundle
  const getT = createTranslationGetter(bundle.translations, { lang })
  const totalStats = aggregateCosmoStats(sense.points.flatMap((p) => p.attributes))
  const attrRows = formatGroupedCosmoAttributeLines(totalStats, getT)
  const totalMaterials = aggregateConsume(sense.points.flatMap((p) => p.consume))
  const heroName = data.heroNameKey ? getT(data.heroNameKey) : getT(data.galleryNameKey)
  const unlockLines = formatCosmoDomainUnlockLines(sense.unlock, getT, heroName)

  return (
    <div className="hero-cosmo-sense-summary space-y-5 rounded-xl border border-panel-border bg-panel p-4 sm:p-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          {getT(UI_KEYS.hero.cosmoSenseUnlock)}
        </p>
        {unlockLines.length > 0 ? (
          <ul className="space-y-1.5 text-sm text-text">
            {unlockLines.map((line, i) => (
              <li key={`${sense.domainId}-unlock-${i}`}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">—</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          {getT(UI_KEYS.hero.cosmoStatsAccumulated)}
        </p>
        {attrRows.length ? (
          <dl className="hero-cosmo-attr-table">
            {attrRows.map((row) => (
              <div key={row.key} className="hero-cosmo-attr-row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
            <div className="hero-cosmo-attr-row hero-cosmo-attr-row--uv">
              <dt>{getT(UI_KEYS.hero.cosmoSenseValue).replace('{0}', '').trim()}</dt>
              <dd>{sense.totalUv}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-text-muted">—</p>
        )}
      </div>

      <HeroTalentConsumeList
        items={totalMaterials}
        label={getT(UI_KEYS.hero.cosmoTotalCost)}
        consumeRefMap={bundle.consumeRefMap}
      />
    </div>
  )
}
