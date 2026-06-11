'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLanguage } from '@/context/language-context'
import { translateKeys } from '@/lib/i18n/language-package'
import { formatDisplayText } from '@/lib/game/apply-skill-values'
import { useHeroTypeDescConfig } from '@/hooks/use-hero-type-desc'

type Filters = {
  camp: string
  stance: string
  damagetype: string
  occupation: string
  quality: string
}

interface FilterBarProps {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  clearFilters: () => void
}

export default function FilterBar({ filters, setFilters, clearFilters }: FilterBarProps) {
  const { lang } = useLanguage()
  const { data: typeMap = {}, isSuccess: typesReady } = useHeroTypeDescConfig()
  const [translations, setTranslations] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!typesReady) return

    const translationKeys = new Set<string>()
    Object.values(typeMap).forEach((desc) => translationKeys.add(desc))

    let cancelled = false
    translateKeys(Array.from(translationKeys), lang).then((tr) => {
      if (!cancelled) setTranslations(tr)
    })
    return () => {
      cancelled = true
    }
  }, [lang, typesReady, typeMap])

  const getT = useCallback(
    (key?: string) => (key ? translations[key] || key : ''),
    [translations]
  )

  const renderSelect = useCallback(
    (
      field: keyof Filters,
      label: string,
      values: number[],
      options?: { useQualityMap?: boolean }
    ) => {
      const { useQualityMap = false } = options || {}

      let optionList: { value: number; labelHtml: string }[] = []

      if (useQualityMap) {
        const qualityMap: Record<number, string> = {
          2: 'R',
          3: 'SR',
          4: 'SSR',
          5: 'UR',
        }
        optionList = values.map((v) => ({
          value: v,
          labelHtml: qualityMap[v],
        }))
      } else {
        optionList = values.map((v) => {
          const labelKey = typeMap[`${field}_${v}`] || `${field}_${v}`
          const html = formatDisplayText(getT(labelKey), 0, {})
          return { value: v, labelHtml: html }
        })
      }

      return (
        <div className="flex min-w-[140px] flex-col text-sm">
          <label className="field-label">{label}</label>
          <select
            value={filters[field]}
            onChange={(e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }))}
            className="control-input"
          >
            <option value="">All</option>
            {optionList.map((o) => (
              <option
                key={o.value}
                value={o.value}
                dangerouslySetInnerHTML={{ __html: o.labelHtml }}
              />
            ))}
          </select>
        </div>
      )
    },
    [filters, setFilters, typeMap, getT]
  )

  return (
    <div className="flex flex-wrap gap-4 mb-4 items-end">
      {renderSelect('quality', 'Quality', [2, 3, 4, 5], { useQualityMap: true })}
      {renderSelect('occupation', 'Class', [1, 2, 3, 4, 5])}
      {renderSelect('stance', 'Position', [1, 2, 3])}
      {renderSelect('damagetype', 'Damage Type', [1, 2])}
      {renderSelect('camp', 'Faction', [1, 2, 3, 4])}

      <button type="button" onClick={clearFilters} className="btn-secondary">
        Clear
      </button>
    </div>
  )
}
