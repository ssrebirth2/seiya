'use client'

import { Search, X } from 'lucide-react'
import GameImage from '@/components/ui/GameImage'
import { Input } from '@/components/ui/v2'
import {
  ITEM_QUALITY_SHOW_TYPE,
  resolveItemQualityFramePath,
} from '@/lib/game/item-quality-ui'
import { artifactRestrictionChipKey } from '@/lib/game/artifact-equip'
import type { ForceCardRestrictionChip } from '@/lib/game/force-card-equip'
import { getFilterAllIconPath } from '@/lib/game/hero-ui-sprites'
import { formatPlainLabel } from '@/lib/game/apply-skill-values'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { qualityNameKey } from '@/lib/i18n/ui-keys'
import { useLanguage } from '@/context/language-context'

export type ArtifactListFilters = {
  quality: string
  restriction: string
  search: string
}

export type ArtifactSortKey = 'id' | 'name' | 'quality'

type ArtifactFilterBarProps = {
  filters: ArtifactListFilters
  sortBy: ArtifactSortKey
  qualityTiers: number[]
  restrictionChips: ForceCardRestrictionChip[]
  onFilterChange: (field: keyof ArtifactListFilters, value: string) => void
  onSortChange: (value: ArtifactSortKey) => void
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

function FilterIconButton({
  active,
  label,
  iconSrc,
  onClick,
}: {
  active: boolean
  label: string
  iconSrc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`hero-icon-filter__option${active ? ' hero-icon-filter__option--active' : ''}`}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      <GameImage
        src={iconSrc}
        rawSrc={iconSrc}
        alt=""
        aria-hidden
        className="hero-icon-filter__icon"
      />
    </button>
  )
}

function QualityFramePill({
  active,
  frameQuality,
  label,
  onClick,
}: {
  active: boolean
  frameQuality: number
  label: string
  onClick: () => void
}) {
  const frame = resolveItemQualityFramePath(ITEM_QUALITY_SHOW_TYPE.small, frameQuality)
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

export function ArtifactFilterBar({
  filters,
  sortBy,
  qualityTiers,
  restrictionChips,
  onFilterChange,
  onSortChange,
  onClear,
  getT,
  resultCount,
}: ArtifactFilterBarProps) {
  const { lang } = useLanguage()
  const { t, site } = useUiTranslation()
  const allLabel = t(UI_KEYS.filter.all)
  const allIcon = getFilterAllIconPath(lang)

  const hasActiveFilters = Boolean(
    filters.quality || filters.restriction || filters.search.trim()
  )

  const sortOptions: { value: ArtifactSortKey; label: string }[] = [
    { value: 'id', label: site('id') },
    { value: 'name', label: site('name') },
    { value: 'quality', label: t(UI_KEYS.common.quality) },
  ]

  return (
    <div className="force-card-filter-bar hero-icon-filter-bar artifact-filter-bar">
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
              placeholder={site('searchPlaceholderArtifact')}
              aria-label={t(UI_KEYS.filter.search)}
              className="force-card-filter-bar__search-input"
            />
          </div>
        </div>

        <div className="force-card-filter-bar__controls">
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
                    <QualityFramePill
                      key={q}
                      active={filters.quality === String(q)}
                      frameQuality={q + 1}
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

          {restrictionChips.length > 0 ? (
            <div className="hero-icon-filter-bar__group">
              <span className="hero-icon-filter-bar__group-label">
                {t(UI_KEYS.artifact.restriction)}
              </span>
              <div
                className="hero-icon-filter-bar__options artifact-restriction-filter__options"
                role="group"
                aria-label={t(UI_KEYS.artifact.restriction)}
              >
                <FilterIconButton
                  active={filters.restriction === ''}
                  label={allLabel}
                  iconSrc={allIcon}
                  onClick={() => onFilterChange('restriction', '')}
                />
                {restrictionChips.map((chip) => {
                  if (!chip.iconSrc) return null
                  const key = artifactRestrictionChipKey(chip)
                  const label = formatPlainLabel(getT(chip.labelKey), 0, {})
                  return (
                    <FilterIconButton
                      key={key}
                      active={filters.restriction === key}
                      label={label}
                      iconSrc={chip.iconSrc}
                      onClick={() =>
                        onFilterChange(
                          'restriction',
                          filters.restriction === key ? '' : key
                        )
                      }
                    />
                  )
                })}
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

export default ArtifactFilterBar
