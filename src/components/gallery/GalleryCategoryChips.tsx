'use client'

import type { GalleryCategory } from '@/lib/game/gallery-types'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

export type GalleryCategoryChipsProps = {
  overall: GalleryCategory | null
  categories: GalleryCategory[]
  /** null = overall gift track + all entries */
  selectedType: string | null
  onSelectType: (type: string | null) => void
  getT: (key: string) => string
}

export function GalleryCategoryChips({
  overall,
  categories,
  selectedType,
  onSelectType,
  getT,
}: GalleryCategoryChipsProps) {
  const { t } = useUiTranslation()

  return (
    <div className="gallery-cat-strip" role="group">
      <div className="gallery-cat-strip__inner">
        <button
          type="button"
          className={`gallery-cat-chip ${selectedType == null ? 'gallery-cat-chip--active' : ''}`}
          onClick={() => onSelectType(null)}
        >
          {overall ? getT(overall.labelKey) : t(UI_KEYS.common.progress)}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.type}
            type="button"
            className={`gallery-cat-chip ${selectedType === cat.type ? 'gallery-cat-chip--active' : ''}`}
            onClick={() => onSelectType(cat.type)}
          >
            {getT(cat.labelKey)}
            <span className="gallery-cat-chip__count">{cat.entryCount}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
