'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/v2'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type GalleryCollectionBarProps = {
  search: string
  onSearchChange: (value: string) => void
  onClear: () => void
  resultCount: number
  hasActiveFilters: boolean
}

export function GalleryCollectionBar({
  search,
  onSearchChange,
  onClear,
  resultCount,
  hasActiveFilters,
}: GalleryCollectionBarProps) {
  const { t, site } = useUiTranslation()

  return (
    <div className="gallery-collection-bar">
      <div className="gallery-collection-bar__row">
        <div className="force-card-filter-bar__search gallery-collection-bar__search">
          <Search size={16} className="force-card-filter-bar__search-icon" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t(UI_KEYS.filter.search)}
            aria-label={t(UI_KEYS.filter.search)}
            className="force-card-filter-bar__search-input"
          />
        </div>
        <div className="gallery-collection-bar__actions">
          {hasActiveFilters ? (
            <button type="button" onClick={onClear} className="force-card-filter-bar__clear">
              <X size={14} aria-hidden />
              {t(UI_KEYS.filter.clearAll)}
            </button>
          ) : null}
          <span
            className="hero-icon-filter-bar__count-badge"
            aria-label={`${resultCount} ${site('found')}`}
          >
            {resultCount}
          </span>
        </div>
      </div>
    </div>
  )
}
