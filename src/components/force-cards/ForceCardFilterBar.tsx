'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/v2'
import type { ForceCardRestrictionFilter } from '@/lib/game/force-card-equip'
import { getForceCardQualityToneClass } from '@/lib/game/dynamis-ui'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { forceCardQualityNameKey } from '@/lib/i18n/ui-keys'

export type ForceCardListFilters = {
  quality: string
  search: string
  restriction: string
}

export type ForceCardSortKey = 'id' | 'name' | 'quality'

type ForceCardFilterBarProps = {
  filters: ForceCardListFilters
  sortBy: ForceCardSortKey
  qualityTiers: number[]
  restrictionMap: Map<number, Set<ForceCardRestrictionFilter>>
  onFilterChange: (field: keyof ForceCardListFilters, value: string) => void
  onSortChange: (value: ForceCardSortKey) => void
  onClear: () => void
  getT: (key: string | undefined) => string
  resultCount: number
}

const RESTRICTION_FILTER_TYPES: ForceCardRestrictionFilter[] = [
  'stance',
  'damagetype',
  'occupation',
  'hero_camp',
  'hero_sids',
]

function SortPill({
  active,
  label,
  onClick,
  className = '',
}: {
  active: boolean
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      className={`catalog-sort-pill${active ? ' catalog-sort-pill--active' : ''} ${className}`.trim()}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}

function QualityColorPill({
  active,
  label,
  toneClass,
  onClick,
}: {
  active: boolean
  label: string
  toneClass: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`catalog-sort-pill force-card-quality-pill ${toneClass}${active ? ' force-card-quality-pill--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
      title={label}
    >
      <span className="force-card-quality-pill__dot" aria-hidden />
      <span className="force-card-quality-pill__label">{label}</span>
    </button>
  )
}

export function ForceCardFilterBar({
  filters,
  sortBy,
  qualityTiers,
  restrictionMap,
  onFilterChange,
  onSortChange,
  onClear,
  getT,
  resultCount,
}: ForceCardFilterBarProps) {
  const { t, site } = useUiTranslation()

  const restrictionFilterLabel = (type: ForceCardRestrictionFilter): string => {
    switch (type) {
      case 'stance':
        return t(UI_KEYS.filter.position)
      case 'damagetype':
        return t(UI_KEYS.filter.damageType)
      case 'occupation':
        return t(UI_KEYS.filter.class)
      case 'hero_camp':
      case 'camp':
        return site('restrictionCamp')
      case 'hero_sids':
        return site('restrictionHero')
      default:
        return type
    }
  }

  const allLabel = t(UI_KEYS.filter.all)
  const hasActiveFilters = Boolean(
    filters.quality || filters.search.trim() || filters.restriction
  )

  const restrictionTypes = RESTRICTION_FILTER_TYPES.filter((type) =>
    Array.from(restrictionMap.values()).some((set) => set.has(type))
  )

  const sortOptions: { value: ForceCardSortKey; label: string }[] = [
    { value: 'id', label: site('id') },
    { value: 'name', label: site('name') },
    { value: 'quality', label: t(UI_KEYS.common.quality) },
  ]

  return (
    <div className="force-card-filter-bar hero-icon-filter-bar">
      <div className="hero-icon-filter-bar__groups force-card-filter-bar__groups">
        <div className="hero-icon-filter-bar__header">
          <h2 className="hero-icon-filter-bar__title">{t(UI_KEYS.filter.filter)}</h2>
          <div className="force-card-filter-bar__header-actions">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={onClear}
                className="force-card-filter-bar__clear"
              >
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

        <div className="hero-icon-filter-bar__search force-card-filter-bar__search">
          <Search size={16} className="force-card-filter-bar__search-icon" aria-hidden />
          <Input
            type="search"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder={site('searchPlaceholderCard')}
            aria-label={site('searchByName')}
            className="force-card-filter-bar__search-input"
          />
        </div>

        <div className="force-card-filter-bar__controls">
          <div className="hero-icon-filter-bar__group">
            <span className="hero-icon-filter-bar__group-label">{t(UI_KEYS.common.quality)}</span>
            <div className="catalog-sort-pills" role="group" aria-label={t(UI_KEYS.common.quality)}>
              <SortPill
                active={filters.quality === ''}
                label={allLabel}
                onClick={() => onFilterChange('quality', '')}
              />
              {qualityTiers.map((q) => (
                <QualityColorPill
                  key={q}
                  active={filters.quality === String(q)}
                  label={getT(forceCardQualityNameKey(q))}
                  toneClass={getForceCardQualityToneClass(q)}
                  onClick={() =>
                    onFilterChange('quality', filters.quality === String(q) ? '' : String(q))
                  }
                />
              ))}
            </div>
          </div>

          {restrictionTypes.length > 0 ? (
            <div className="hero-icon-filter-bar__group">
              <span className="hero-icon-filter-bar__group-label">
                {t(UI_KEYS.forceCard.restrictionFilter)}
              </span>
              <div className="catalog-sort-pills" role="group">
                <SortPill
                  active={filters.restriction === ''}
                  label={allLabel}
                  onClick={() => onFilterChange('restriction', '')}
                />
                {restrictionTypes.map((type) => (
                  <SortPill
                    key={type}
                    active={filters.restriction === type}
                    label={restrictionFilterLabel(type)}
                    onClick={() =>
                      onFilterChange(
                        'restriction',
                        filters.restriction === type ? '' : type
                      )
                    }
                  />
                ))}
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
