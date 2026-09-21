'use client'

import { Search, X } from 'lucide-react'
import { Input, Select } from '@/components/ui/v2'
import { skillTypeLcKey } from '@/lib/game/format-skill-labels'
import {
  skillBandFilterLabel,
} from '@/lib/game/skill-filter-labels'
import { SKILL_ID_BANDS, type SkillIdBand } from '@/lib/game/skill-id-band'
import type { SkillCatalogFilters } from '@/lib/game/skill-catalog'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

export type SkillListFilters = Omit<SkillCatalogFilters, 'sortBy' | 'search'> & {
  search: string
}

export type SkillSortKey = SkillCatalogFilters['sortBy']

type SkillFilterBarProps = {
  filters: SkillListFilters
  sortBy: SkillSortKey
  tagOptions: { value: string; label: string }[]
  onFilterChange: <K extends keyof SkillListFilters>(field: K, value: SkillListFilters[K]) => void
  onSortChange: (value: SkillSortKey) => void
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

export function SkillFilterBar({
  filters,
  sortBy,
  tagOptions,
  onFilterChange,
  onSortChange,
  onClear,
  getT,
  resultCount,
}: SkillFilterBarProps) {
  const { t, site } = useUiTranslation()
  const allLabel = t(UI_KEYS.filter.all)

  const hasActiveFilters = Boolean(
    filters.skillType ||
      filters.tag ||
      filters.band ||
      filters.search.trim()
  )

  const sortOptions: { value: SkillSortKey; label: string }[] = [
    { value: 'id', label: site('id') },
    { value: 'name', label: site('name') },
    { value: 'type', label: site('type') },
  ]

  return (
    <div className="force-card-filter-bar hero-icon-filter-bar skill-filter-bar">
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
              placeholder={site('searchPlaceholderSkill')}
              aria-label={site('searchByName')}
              className="force-card-filter-bar__search-input"
            />
          </div>
        </div>

        <div className="force-card-filter-bar__controls">
          <div className="hero-icon-filter-bar__group">
            <span className="hero-icon-filter-bar__group-label">{site('type')}</span>
            <div className="catalog-sort-pills" role="group" aria-label={site('type')}>
              <SortPill
                active={filters.skillType === ''}
                label={allLabel}
                onClick={() => onFilterChange('skillType', '')}
              />
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                const key = skillTypeLcKey(n)
                const label = key ? getT(key) : String(n)
                return (
                  <SortPill
                    key={n}
                    active={filters.skillType === String(n)}
                    label={label}
                    onClick={() =>
                      onFilterChange(
                        'skillType',
                        filters.skillType === String(n) ? '' : String(n)
                      )
                    }
                  />
                )
              })}
            </div>
          </div>

          <div className="hero-icon-filter-bar__group">
            <span className="hero-icon-filter-bar__group-label">{site('skillBand')}</span>
            <div className="catalog-sort-pills" role="group" aria-label={site('skillBand')}>
              <SortPill
                active={filters.band === ''}
                label={allLabel}
                onClick={() => onFilterChange('band', '')}
              />
              {SKILL_ID_BANDS.filter((b) => b !== 'other' && b !== 'stub').map((band) => (
                <SortPill
                  key={band}
                  active={filters.band === band}
                  label={skillBandFilterLabel(band as SkillIdBand, t, site)}
                  onClick={() => onFilterChange('band', filters.band === band ? '' : band)}
                />
              ))}
            </div>
          </div>

          {tagOptions.length > 0 ? (
            <div className="hero-icon-filter-bar__group item-filter-bar__type-group">
              <span className="hero-icon-filter-bar__group-label">{site('tags')}</span>
              <Select
                value={filters.tag}
                onChange={(e) => onFilterChange('tag', e.target.value)}
                aria-label={site('tags')}
                className="item-filter-bar__type-select"
              >
                <option value="">{allLabel}</option>
                {tagOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
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

export default SkillFilterBar
