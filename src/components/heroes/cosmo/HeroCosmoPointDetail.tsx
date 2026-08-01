'use client'

import HeroTalentConsumeList from '@/components/heroes/HeroTalentConsumeList'
import { useLanguage } from '@/context/language-context'
import { aggregateConsume } from '@/lib/game/aggregate-consume'
import { statsThroughPoints, cumulativeUvThroughPoints } from '@/lib/game/aggregate-cosmo-stats'
import { findUnlockPath, consumesOnUnlockPath } from '@/lib/game/build-cosmo-unlock-path'
import { formatCosmoAttributeLine } from '@/lib/game/format-cosmo-attribute'
import { formatCosmoDomainUnlockLines } from '@/lib/game/format-cosmo-unlock'
import { createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import type { CosmoPointData, CosmoSenseData, HeroCosmoBundle } from '@/lib/game/cosmo-types'

type Props = {
  point: CosmoPointData
  sense: CosmoSenseData
  bundle: HeroCosmoBundle
}

export default function HeroCosmoPointDetail({ point, sense, bundle }: Props) {
  const { lang } = useLanguage()
  const { site } = useUiTranslation()
  const getT = createTranslationGetter(bundle.translations, { lang })
  const pointsByIndex = new Map<number, CosmoPointData>()
  sense.points.forEach((p) => pointsByIndex.set(p.index, p))

  const path = findUnlockPath(point, pointsByIndex, sense.lines)
  const pathPoints = consumesOnUnlockPath(path)
  const cumulativeMaterials = aggregateConsume(pathPoints.flatMap((p) => p.consume))
  const cumulativeStats = statsThroughPoints(sense.points, point.index)
  const cumulativeUv = cumulativeUvThroughPoints(sense.points, point.index)
  const heroName = bundle.data.heroNameKey
    ? getT(bundle.data.heroNameKey)
    : getT(bundle.data.galleryNameKey)
  const senseUnlockLines = formatCosmoDomainUnlockLines(sense.unlock, getT, heroName)

  return (
    <div className="space-y-4 rounded-xl border border-panel-border bg-panel p-3 sm:p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {getT(UI_KEYS.common.detail)} #{point.index}
        </p>
        <p className="text-sm text-text-muted">
          +{point.addUv} {getT(UI_KEYS.hero.cosmoSenseValue).replace('{0}', '').trim()}
        </p>
      </div>

      {(point.needUv > 0 || point.needTotalUv > 0 || point.needHeroLevel > 0) && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {getT(UI_KEYS.common.unlockCondition)}
          </p>
          <ul className="space-y-1 text-sm text-text-muted">
            {point.needUv > 0 ? (
              <li>
                {getT(UI_KEYS.hero.cosmoUv)}: {point.needUv}
              </li>
            ) : null}
            {point.needTotalUv > 0 ? (
              <li>
                {getT(UI_KEYS.hero.cosmoTotalUv)}: {point.needTotalUv}
              </li>
            ) : null}
            {point.needHeroLevel > 0 ? (
              <li>
                {getT(UI_KEYS.hero.cosmoHeroLevel)} {point.needHeroLevel}
              </li>
            ) : null}
          </ul>
        </div>
      )}

      {senseUnlockLines.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {getT(UI_KEYS.hero.cosmoSenseUnlock)}
          </p>
          <ul className="space-y-1 text-sm">
            {senseUnlockLines.map((line, i) => (
              <li key={`${sense.domainId}-unlock-${i}`}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          {getT(UI_KEYS.hero.cosmoStatsAccumulated)}
        </p>
        {cumulativeStats.length ? (
          <ul className="space-y-1 text-sm">
            {cumulativeStats.map((stat) => {
              const line = formatCosmoAttributeLine(stat, getT)
              return (
                <li key={`${stat.statKey}-${stat.ratioFlag}`} className="flex justify-between gap-2">
                  <span>{line.label}</span>
                  <span className="font-medium text-accent">{line.value}</span>
                </li>
              )
            })}
            <li className="flex justify-between gap-2 border-t border-panel-border pt-1">
              <span>{getT(UI_KEYS.hero.cosmoSenseValue)}</span>
              <span className="font-medium">{cumulativeUv}</span>
            </li>
          </ul>
        ) : (
          <p className="text-sm text-text-muted">—</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <HeroTalentConsumeList
          items={point.consume}
          label={getT(UI_KEYS.hero.cosmoTotalCost)}
          consumeRefMap={bundle.consumeRefMap}
        />
        <HeroTalentConsumeList
          items={cumulativeMaterials}
          label={site('cumulativeTotal')}
          consumeRefMap={bundle.consumeRefMap}
        />
      </div>
    </div>
  )
}
