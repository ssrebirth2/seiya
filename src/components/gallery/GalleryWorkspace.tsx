'use client'

import { useMemo } from 'react'
import { ConsumeList } from '@/components/game/ConsumeList'
import { GalleryCategoryChips } from '@/components/gallery/GalleryCategoryChips'
import { GalleryEntryList } from '@/components/gallery/GalleryEntryList'
import { GalleryProgressPanel } from '@/components/gallery/GalleryProgressPanel'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import type { GalleryCategory, GalleryEntry, GalleryTotals } from '@/lib/game/gallery-types'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type GalleryWorkspaceProps = {
  overall: GalleryCategory | null
  categories: GalleryCategory[]
  entries: GalleryEntry[]
  totals: GalleryTotals
  consumeRefMap: ConsumeRefMap
  getT: (key: string) => string
  categoryType: string | null
  onCategoryTypeChange: (type: string | null) => void
}

export function GalleryWorkspace({
  overall,
  categories,
  entries,
  totals,
  consumeRefMap,
  getT,
  categoryType,
  onCategoryTypeChange,
}: GalleryWorkspaceProps) {
  const { t } = useUiTranslation()

  const globalCurrencyItems = useMemo(
    (): ConsumeEntry[] =>
      [
        totals.totalRmb > 0 ? { num: totals.totalRmb, type: 'rmb' } : null,
        totals.totalGold > 0 ? { num: totals.totalGold, type: 'role_money' } : null,
      ].filter((x): x is ConsumeEntry => x != null),
    [totals.totalRmb, totals.totalGold]
  )

  return (
    <div className="gallery-workspace space-y-4">
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

      <div className="gallery-workspace__sticky">
        <GalleryCategoryChips
          overall={overall}
          categories={categories}
          selectedType={categoryType}
          onSelectType={onCategoryTypeChange}
          getT={getT}
        />
      </div>

      <section className="gallery-workspace__section" aria-labelledby="gallery-gifts-heading">
        <h2 id="gallery-gifts-heading" className="gallery-workspace__section-title">
          {t(UI_KEYS.gallery.progressTab)}
        </h2>
        <GalleryProgressPanel
          overall={overall}
          categories={categories}
          totals={totals}
          consumeRefMap={consumeRefMap}
          getT={getT}
          selectedType={categoryType}
          showTotals={false}
        />
      </section>

      {categoryType != null ? (
        <section className="gallery-workspace__section" aria-labelledby="gallery-collect-heading">
          <h2 id="gallery-collect-heading" className="gallery-workspace__section-title">
            {t(UI_KEYS.gallery.entriesTab)}
          </h2>
        <GalleryEntryList
          categories={categories}
          entries={entries}
          getT={getT}
          categoryType={categoryType}
        />
        </section>
      ) : null}
    </div>
  )
}
