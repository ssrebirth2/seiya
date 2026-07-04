'use client'

import { Search, X } from 'lucide-react'
import { ITEM_BAG_TABS } from '@/lib/game/item-catalog'
import type { ItemCatalogSortKey } from '@/lib/game/item-catalog'
import {
  ITEM_QUALITY_SHOW_TYPE,
  resolveItemQualityFramePath,
} from '@/lib/game/item-quality-ui'
import GameImage from '@/components/ui/GameImage'
import { Input, Select } from '@/components/ui/v2'
import { formatChildType } from '@/lib/game/item-metadata'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { qualityNameKey } from '@/lib/i18n/ui-keys'

export type ItemListFilters = {
  tab: string
  quality: string
  childType: string
  search: string
}

type ItemFilterBarProps = {
  filters: ItemListFilters
  sortBy: ItemCatalogSortKey
  qualityTiers: number[]
  childTypes: string[]
  onFilterChange: (field: keyof ItemListFilters, value: string) => void
  onSortChange: (value: ItemCatalogSortKey) => void
  onClear: () => void
  getT: (key?: string) => string
  resultCount: number
}

function SortPill({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`catalog-sort-pill${active ? ' catalog-sort-pill--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}

function ItemQualityFramePill({
  active,
  quality,
  label,
  onClick,
}: {
  active: boolean
  quality: number
  label: string
  onClick: () => void
}) {
  const frame = resolveItemQualityFramePath(ITEM_QUALITY_SHOW_TYPE.small, quality)
  if (!frame) return null

  return (
    <button
      type="button"
      className={`hero-icon-filter__option item-filter-quality__option${active ? ' hero-icon-filter__option--active' : ''}`}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      <GameImage
        src={frame.src}
        rawSrc={frame.rawSrc ?? frame.src}
        alt=""
        aria-hidden
        className="item-filter-quality__frame"
      />
    </button>
  )
}

export function ItemFilterBar({
  filters,
  sortBy,
  qualityTiers,
  childTypes,
  onFilterChange,
  onSortChange,
  onClear,
  getT,
  resultCount,
}: ItemFilterBarProps) {
  const { t, site } = useUiTranslation()
  const allLabel = t(UI_KEYS.filter.all)

  const hasActiveFilters = Boolean(
    filters.tab !== '0' || filters.quality || filters.childType || filters.search.trim()
  )

  const sortOptions: { value: ItemCatalogSortKey; label: string }[] = [
    { value: 'id', label: site('id') },
    { value: 'sort_weight', label: t(UI_KEYS.filter.advanceSort) },
    { value: 'name', label: site('name') },
    { value: 'quality', label: t(UI_KEYS.common.quality) },
  ]

  return (
    <div className="force-card-filter-bar hero-icon-filter-bar item-filter-bar">
      <div className="hero-icon-filter-bar__groups force-card-filter-bar__groups">
        <div className="hero-icon-filter-bar__header">
          <h2 className="hero-icon-filter-bar__title">{t(UI_KEYS.filter.filter)}</h2>
          <div className="force-card-filter-bar__header-actions">
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

        <div className="force-card-filter-bar__search-fields">
          <div className="force-card-filter-bar__search">
            <Search size={16} className="force-card-filter-bar__search-icon" aria-hidden />
            <Input
              type="search"
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              placeholder={site('searchItemPlaceholder')}
              aria-label={t(UI_KEYS.filter.search)}
              className="force-card-filter-bar__search-input"
            />
          </div>
        </div>

        <div className="force-card-filter-bar__controls">
          <div className="hero-icon-filter-bar__group">
            <span className="hero-icon-filter-bar__group-label">{site('category')}</span>
            <div className="catalog-sort-pills" role="group" aria-label={site('category')}>
              {ITEM_BAG_TABS.map((tab) => (
                <SortPill
                  key={tab.itemType}
                  active={filters.tab === tab.itemType}
                  label={getT(tab.nameKey)}
                  onClick={() => onFilterChange('tab', tab.itemType)}
                />
              ))}
            </div>
          </div>

          {childTypes.length > 0 ? (
            <div className="hero-icon-filter-bar__group item-filter-bar__type-group">
              <span className="hero-icon-filter-bar__group-label">{site('type')}</span>
              <Select
                value={filters.childType}
                onChange={(e) => onFilterChange('childType', e.target.value)}
                aria-label={site('type')}
                className="item-filter-bar__type-select"
              >
                <option value="">{allLabel}</option>
                {childTypes.map((childType) => (
                  <option key={childType} value={childType}>
                    {formatChildType(childType)}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {qualityTiers.length > 0 ? (
            <div className="hero-icon-filter-bar__group">
              <span className="hero-icon-filter-bar__group-label">{t(UI_KEYS.common.quality)}</span>
              <div
                className="item-filter-quality__controls"
                role="group"
                aria-label={t(UI_KEYS.common.quality)}
              >
                <div className="catalog-sort-pills">
                  <SortPill
                    active={filters.quality === ''}
                    label={allLabel}
                    onClick={() => onFilterChange('quality', '')}
                  />
                </div>
                <div className="hero-icon-filter-bar__options item-filter-quality__frames">
                  {qualityTiers.map((q) => (
                    <ItemQualityFramePill
                      key={q}
                      active={filters.quality === String(q)}
                      quality={q}
                      label={getT(qualityNameKey(q))}
                      onClick={() =>
                        onFilterChange('quality', filters.quality === String(q) ? '' : String(q))
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div className="hero-icon-filter-bar__group">
            <span className="hero-icon-filter-bar__group-label">{site('sortBy')}</span>
            <div className="catalog-sort-pills" role="group" aria-label={site('sortBy')}>
              {sortOptions.map((option) => (
                <SortPill
                  key={option.value}
                  active={sortBy === option.value}
                  label={option.label}
                  onClick={() => onSortChange(option.value)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ItemFilterBar
