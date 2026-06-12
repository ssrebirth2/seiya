'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { formatDisplayText } from '@/lib/game/apply-skill-values'
import { useHeroTypeDescConfig } from '@/hooks/use-hero-type-desc'
import { qualityNameKey } from '@/lib/i18n/ui-keys'

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
  const { t, site } = useUiTranslation()
  const { data: typeMap = {}, isSuccess: typesReady } = useHeroTypeDescConfig()
  const [translations, setTranslations] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!typesReady) return

    const translationKeys = new Set<string>()
    Object.values(typeMap).forEach((desc) => translationKeys.add(desc))
    ;[2, 3, 4, 5].forEach((q) => translationKeys.add(qualityNameKey(q)))

    let cancelled = false
    translateKeys(Array.from(translationKeys), lang).then((tr) => {
      if (!cancelled) setTranslations(tr)
    })
    return () => {
      cancelled = true
    }
  }, [lang, typesReady, typeMap])

  const getT = useMemo(() => createTranslationGetter(translations), [translations])

  const renderSelect = useCallback(
    (
      field: keyof Filters,
      label: string,
      values: number[],
      options?: { useQualityKeys?: boolean }
    ) => {
      const { useQualityKeys = false } = options || {}

      const optionList = values.map((v) => {
        if (useQualityKeys) {
          return {
            value: v,
            labelHtml: getT(qualityNameKey(v)),
          }
        }
        const labelKey = typeMap[`${field}_${v}`] || `${field}_${v}`
        const html = formatDisplayText(getT(labelKey), 0, {})
        return { value: v, labelHtml: html }
      })

      return (
        <div className="mb-4 flex min-w-[140px] flex-col text-sm">
          <label className="field-label">{label}</label>
          <select
            value={filters[field]}
            onChange={(e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }))}
            className="control-input"
          >
            <option value="">{t(UI_KEYS.filter.all)}</option>
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
    [filters, setFilters, typeMap, getT, t]
  )

  return (
    <div className="mb-4 flex flex-wrap items-end gap-4">
      {renderSelect('quality', t(UI_KEYS.common.quality), [2, 3, 4, 5], { useQualityKeys: true })}
      {renderSelect('occupation', t(UI_KEYS.filter.class), [1, 2, 3, 4, 5])}
      {renderSelect('stance', t(UI_KEYS.filter.position), [1, 2, 3])}
      {renderSelect('damagetype', t(UI_KEYS.filter.damageType), [1, 2])}
      {renderSelect('camp', t(UI_KEYS.filter.faction), [1, 2, 3, 4])}

      <button type="button" onClick={clearFilters} className="btn-secondary">
        {t(UI_KEYS.filter.clearAll)}
      </button>
    </div>
  )
}
