'use client'

import GameImage from '@/components/ui/GameImage'
import { Input } from '@/components/ui/v2'
import { formatDisplayText } from '@/lib/game/apply-skill-values'
import {
  getAttackTypeIconPath,
  getCampIconPath,
  getFilterAllIconPath,
  getOccupationIconPath,
  getPositionIconPath,
  getQualityIconPath,
  getQualityIconClassName,
} from '@/lib/game/hero-ui-sprites'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { HERO_QUALITY_IDS, qualityNameKey } from '@/lib/i18n/ui-keys'
import { useLanguage } from '@/context/language-context'

export type HeroListFilters = {
  camp: string
  stance: string
  damagetype: string
  occupation: string
  quality: string
  search: string
}

type HeroIconFilterBarProps = {
  filters: HeroListFilters
  onChange: (field: keyof HeroListFilters, value: string) => void
  typeMap: Record<string, string>
  getT: (key: string | undefined) => string
  resultCount: number
  variant?: 'catalog' | 'toolbar'
}

type FilterField = 'camp' | 'stance' | 'damagetype' | 'occupation' | 'quality'

type FilterOption = {
  value: number | 'all'
  iconSrc: string
  label: string
  iconClassName?: string
}

type FilterGroup = {
  field: FilterField
  title: string
  options: FilterOption[]
}

function plainLabel(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function FilterIconButton({
  active,
  label,
  iconSrc,
  iconClassName = '',
  onClick,
}: {
  active: boolean
  label: string
  iconSrc: string
  iconClassName?: string
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
        key={iconSrc}
        src={iconSrc}
        alt=""
        aria-hidden
        className={`hero-icon-filter__icon ${iconClassName}`.trim()}
        rawSrc={iconSrc}
      />
    </button>
  )
}

export function HeroIconFilterBar({
  filters,
  onChange,
  typeMap,
  getT,
  resultCount,
  variant = 'catalog',
}: HeroIconFilterBarProps) {
  const { lang } = useLanguage()
  const { t, site } = useUiTranslation()

  const allIcon = getFilterAllIconPath(lang)
  const allLabel = t(UI_KEYS.filter.all)

  const typeLabel = (field: Exclude<FilterField, 'quality'>, value: number) => {
    const raw = typeMap[`${field}_${value}`]
    return plainLabel(formatDisplayText(getT(raw), 0, {}))
  }

  const select = (field: FilterField, value: number | 'all') => {
    onChange(field, value === 'all' ? '' : String(value))
  }

  const withAll = (
    field: Exclude<FilterField, 'quality'>,
    values: number[],
    iconFor: (value: number) => string
  ): FilterOption[] => [
    { value: 'all', iconSrc: allIcon, label: allLabel },
    ...values.map((value) => ({
      value,
      iconSrc: iconFor(value),
      label: typeLabel(field, value),
    })),
  ]

  const groups: FilterGroup[] = [
    {
      field: 'camp',
      title: t(UI_KEYS.filter.faction),
      options: withAll('camp', [1, 2, 3, 4], getCampIconPath),
    },
    {
      field: 'stance',
      title: t(UI_KEYS.filter.position),
      options: withAll('stance', [1, 2, 3], (value) => getPositionIconPath(value, lang)),
    },
    {
      field: 'damagetype',
      title: t(UI_KEYS.filter.damageType),
      options: withAll('damagetype', [1, 2], getAttackTypeIconPath),
    },
    {
      field: 'occupation',
      title: t(UI_KEYS.filter.class),
      options: withAll('occupation', [1, 2, 3, 4, 5], getOccupationIconPath),
    },
    {
      field: 'quality',
      title: t(UI_KEYS.common.quality),
      options: [
        { value: 'all', iconSrc: allIcon, label: allLabel },
        ...HERO_QUALITY_IDS.map((value) => ({
          value,
          iconSrc: getQualityIconPath(value, value),
          label: t(qualityNameKey(value)),
          iconClassName: getQualityIconClassName(value, value) || undefined,
        })),
      ],
    },
  ]

  const isToolbar = variant === 'toolbar'

  const renderGroup = (group: FilterGroup) => (
    <div key={group.field} className="hero-icon-filter-bar__group">
      <span className="hero-icon-filter-bar__group-label">{group.title}</span>
      <div
        className="hero-icon-filter-bar__options"
        role="group"
        aria-label={group.title}
      >
        {group.options.map((option) => (
          <FilterIconButton
            key={`${group.field}-${option.value}`}
            active={
              option.value === 'all'
                ? filters[group.field] === ''
                : filters[group.field] === String(option.value)
            }
            label={option.label}
            iconSrc={option.iconSrc}
            iconClassName={option.iconClassName}
            onClick={() => select(group.field, option.value)}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div className={`hero-icon-filter-bar${isToolbar ? ' hero-icon-filter-bar--toolbar' : ''}`}>
      <div className="hero-icon-filter-bar__groups">
        {isToolbar ? (
          <>
            <div className="hero-icon-filter-bar__toolbar-top">
              <div className="hero-icon-filter-bar__header">
                <h2 className="hero-icon-filter-bar__title">{t(UI_KEYS.filter.filter)}</h2>
                <span
                  className="hero-icon-filter-bar__count-badge"
                  aria-label={`${resultCount} ${site('found')}`}
                >
                  {resultCount}
                </span>
              </div>
              <div className="hero-icon-filter-bar__search">
                <Input
                  type="text"
                  value={filters.search}
                  onChange={(e) => onChange('search', e.target.value)}
                  aria-label={site('searchByName')}
                  className="hero-icon-filter-bar__search-input"
                />
              </div>
            </div>
            <div className="hero-icon-filter-bar__filter-grid">{groups.map(renderGroup)}</div>
          </>
        ) : (
          <>
            <div className="hero-icon-filter-bar__header">
              <h2 className="hero-icon-filter-bar__title">{t(UI_KEYS.filter.filter)}</h2>
              <span
                className="hero-icon-filter-bar__count-badge"
                aria-label={`${resultCount} ${site('found')}`}
              >
                {resultCount}
              </span>
            </div>

            <div className="hero-icon-filter-bar__search">
              <Input
                type="text"
                value={filters.search}
                onChange={(e) => onChange('search', e.target.value)}
                aria-label={site('searchByName')}
                className="hero-icon-filter-bar__search-input"
              />
            </div>

            <div className="hero-icon-filter-bar__filter-grid">{groups.map(renderGroup)}</div>
          </>
        )}
      </div>
    </div>
  )
}
