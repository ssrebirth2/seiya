'use client'

import { useMemo } from 'react'
import { ConsumeList } from '@/components/game/ConsumeList'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import type {
  GalleryCategory,
  GalleryEntry,
  GalleryReward,
  GalleryTier,
  GalleryTotals,
} from '@/lib/game/gallery-types'
import { aggregateGalleryTotalRewards } from '@/lib/game/gallery-total-rewards'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type GalleryProgressPanelProps = {
  overall: GalleryCategory | null
  categories: GalleryCategory[]
  entries?: GalleryEntry[]
  totals: GalleryTotals
  consumeRefMap: ConsumeRefMap
  getT: (key: string) => string
  selectedType: string | null
  /** When false, omit the global totals strip (workspace shows it once). */
  showTotals?: boolean
}

function formatNum(n: number): string {
  return n.toLocaleString()
}

function rewardKey(r: GalleryReward): string {
  return `${r.type ?? ''}|${r.sid ?? 0}`
}

function aggregateTrackRewards(tiers: GalleryTier[]): ConsumeEntry[] {
  const map = new Map<string, ConsumeEntry>()
  for (const tier of tiers) {
    if (tier.isCap) continue
    for (const r of tier.rewards) {
      const key = rewardKey(r)
      const prev = map.get(key)
      if (prev) {
        map.set(key, { ...prev, num: prev.num + r.num })
      } else {
        map.set(key, { num: r.num, type: r.type, sid: r.sid })
      }
    }
  }
  return [...map.values()]
}

function pointsLabel(tier: GalleryTier, pointsWord: string): string {
  if (tier.isCap) return `${pointsWord} ≥ ${formatNum(tier.sumExp)}`
  if (tier.exp == null) return `${pointsWord} ${formatNum(tier.sumExp)}`
  return `${pointsWord} ${formatNum(tier.sumExp)} → ${formatNum(tier.sumExp + tier.exp)} (+${formatNum(tier.exp)})`
}

export function GalleryProgressPanel({
  overall,
  categories,
  entries = [],
  totals,
  consumeRefMap,
  getT,
  selectedType,
  showTotals = true,
}: GalleryProgressPanelProps) {
  const { t, site } = useUiTranslation()
  const trackedActive =
    selectedType == null
      ? null
      : categories.find((c) => c.type === selectedType && c.hasLevelTrack) ?? null
  const selectedCat =
    selectedType == null ? null : categories.find((c) => c.type === selectedType) ?? null
  const active = trackedActive ?? (selectedType == null ? overall : null)
  const noTrack = selectedType != null && selectedCat != null && !selectedCat.hasLevelTrack

  const trackRewardItems = useMemo(
    () => (active ? aggregateTrackRewards(active.tiers) : []),
    [active]
  )

  const globalCurrencyItems = useMemo(
    () => aggregateGalleryTotalRewards({ overall, categories, entries }),
    [overall, categories, entries]
  )

  const maxExp = active?.maxExp ?? 0

  return (
    <div className="gallery-progress space-y-3">
      {showTotals ? (
        <section className="gallery-progress__totals">
          <div className="gallery-progress__totals-head">
            <h3 className="gallery-progress__totals-title">{t(UI_KEYS.gallery.maxRewards)}</h3>
          </div>
          {globalCurrencyItems.length > 0 ? (
            <div className="gallery-progress__totals-icons">
              <ConsumeList
                items={globalCurrencyItems}
                consumeRefMap={consumeRefMap}
                layout="row"
                compact
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {noTrack ? (
        <p className="text-sm text-muted gallery-progress__no-track">{site('galleryNoTrack')}</p>
      ) : null}

      {active ? (
        <section className="surface panel gallery-progress__track">
          <header className="gallery-progress__track-head">
            <h3 className="font-display text-base text-fg sm:text-lg">{getT(active.labelKey)}</h3>
            <p className="text-xs text-muted">
              {site('galleryMaxPoints')}: {formatNum(active.maxExp)}
              {active.type === 'gallery' ? (
                <>
                  {' · '}
                  {site('galleryEntries')}: {formatNum(totals.entryCount)}
                  {' · '}
                  {site('galleryPoints')}: {formatNum(totals.totalEntryExp)}
                </>
              ) : (
                <>
                  {' · '}
                  {site('galleryEntries')}: {active.entryCount}
                  {active.totalEntryExp > 0
                    ? ` · ${site('galleryPoints')}: ${formatNum(active.totalEntryExp)}`
                    : null}
                </>
              )}
            </p>
          </header>

          {active.tiers.length === 0 ? (
            <p className="text-sm text-muted">{t(UI_KEYS.common.noData)}</p>
          ) : (
            <>
              <div className="gallery-rail scroll-strip-h" role="list">
                <div className="gallery-rail__inner">
                  <div className="gallery-rail__line" aria-hidden="true">
                    <div className="gallery-rail__line-fill" />
                  </div>
                  {active.tiers.map((tier, index) => {
                    const progress =
                      maxExp > 0
                        ? Math.min(1, tier.sumExp / maxExp)
                        : index / Math.max(1, active.tiers.length - 1)
                    return (
                      <div
                        key={tier.levelId}
                        role="listitem"
                        className={`gallery-rail__node ${tier.isCap ? 'gallery-rail__node--cap' : ''}`}
                        style={{ ['--node-progress' as string]: String(progress) }}
                      >
                        <div className="gallery-rail__dot" aria-hidden="true">
                          <span>{tier.step}</span>
                        </div>
                        <div className="gallery-rail__card">
                          <p className="gallery-rail__title">
                            {tier.titleKey
                              ? getT(tier.titleKey)
                              : `${t(UI_KEYS.common.level)} ${tier.step}`}
                            {tier.isCap ? (
                              <span className="gallery-rail__cap"> ({site('galleryCap')})</span>
                            ) : null}
                          </p>
                          <p className="gallery-rail__points">
                            {pointsLabel(tier, site('galleryPoints'))}
                          </p>
                          {tier.rewards.length > 0 ? (
                            <div className="gallery-rail__rewards">
                              <ConsumeList
                                items={tier.rewards}
                                consumeRefMap={consumeRefMap}
                                layout="rewards"
                                compact
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {trackRewardItems.length > 0 ? (
                <aside className="gallery-progress__accum">
                  <h4 className="gallery-progress__accum-title">{t(UI_KEYS.gallery.accumulated)}</h4>
                  <div className="gallery-progress__accum-icons">
                    <ConsumeList
                      items={trackRewardItems}
                      consumeRefMap={consumeRefMap}
                      layout="rewards"
                      compact
                    />
                  </div>
                </aside>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </div>
  )
}
