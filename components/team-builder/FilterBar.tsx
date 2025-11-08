'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { translateKeys } from '@/lib/translate'
import { applySkillValues } from '@/lib/applySkillValues'

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
  const [typeMap, setTypeMap] = useState<Record<string, string>>({})
  const [translations, setTranslations] = useState<Record<string, string>>({})

  // ============================================================
  // 🔹 Load hero type descriptions and translations
  // ============================================================
  useEffect(() => {
    const loadTypeDescriptions = async () => {
      const { data, error } = await supabase.from('HeroTypeDescConfig').select('key, desc')
      if (error) {
        console.error('Error loading HeroTypeDescConfig:', error.message)
        return
      }

      const map: Record<string, string> = {}
      const translationKeys = new Set<string>()

      data?.forEach((row) => {
        map[row.key] = row.desc
        translationKeys.add(row.desc)
      })

      setTypeMap(map)

      const translated = await translateKeys(Array.from(translationKeys), lang)
      setTranslations(translated)
    }

    loadTypeDescriptions()
  }, [lang])

  const getT = useCallback(
    (key?: string) => (key ? translations[key] || key : ''),
    [translations]
  )

  // ============================================================
  // 🔹 Render a select filter
  // ============================================================
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
        // 🔸 Quality filter uses static map (R, SR, SSR, UR)
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
        // 🔸 Other filters use HeroTypeDescConfig with translations
        optionList = values.map((v) => {
          const labelKey = typeMap[`${field}_${v}`] || `${field}_${v}`
          const html = applySkillValues(getT(labelKey), 0, {})
          return { value: v, labelHtml: html }
        })
      }

      return (
        <div className="flex flex-col text-sm min-w-[140px]">
          <label className="mb-1 text-[var(--text-muted)] font-medium">{label}</label>
          <select
            value={filters[field]}
            onChange={(e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }))}
            className="border p-1 rounded bg-[var(--panel)] border-[var(--panel-border)] focus:ring-1 focus:ring-[var(--panel-border)]"
          >
            <option value="">All</option>
            {optionList.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                dangerouslySetInnerHTML={{ __html: opt.labelHtml }}
              />
            ))}
          </select>
        </div>
      )
    },
    [filters, getT, setFilters, typeMap]
  )

  // ============================================================
  // 🔹 Render filters bar
  // ============================================================
  return (
    <div className="flex flex-wrap gap-4 mb-4 items-end">
      {renderSelect('quality', 'Quality', [2, 3, 4, 5], { useQualityMap: true })}
      {renderSelect('occupation', 'Class', [1, 2, 3, 4, 5])}
      {renderSelect('stance', 'Position', [1, 2, 3])}
      {renderSelect('damagetype', 'Damage Type', [1, 2])}
      {renderSelect('camp', 'Faction', [1, 2, 3, 4])}

      <button
        onClick={clearFilters}
        className="px-3 py-1 rounded text-sm border border-[var(--panel-border)] bg-[var(--panel)] hover:bg-[var(--panel-hover)] transition"
      >
        Clear
      </button>
    </div>
  )
}
