'use client'

import { useCallback, useMemo } from 'react'
import { useHeroTypeDescConfig } from '@/hooks/use-hero-type-desc'
import { formatPlainLabel } from '@/lib/game/apply-skill-values'
import {
  heroTypeDescKey,
  heroTypeIconPath,
  type HeroTypeField,
} from '@/lib/game/hero-type-fields'
import { useLanguage } from '@/context/language-context'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'

export type HeroTypeResolved = {
  src: string
  label: string
}

export function useHeroTypeLabels() {
  const { lang } = useLanguage()
  const { data: typeMap = {} } = useHeroTypeDescConfig()
  const extraKeys = useMemo(
    () => [...new Set(Object.values(typeMap).filter((key) => Boolean(key)))],
    [typeMap]
  )
  const { t } = useUiTranslation(extraKeys)

  return useCallback(
    (field: HeroTypeField, value: number): HeroTypeResolved => {
      const lcKey = typeMap[heroTypeDescKey(field, value)]
      return {
        src: heroTypeIconPath(field, value, lang),
        label: lcKey ? formatPlainLabel(t(lcKey)) : '',
      }
    },
    [lang, t, typeMap]
  )
}
