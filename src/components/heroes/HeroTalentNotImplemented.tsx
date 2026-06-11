'use client'

import React from 'react'
import { NOT_AVAILABLE_LABEL } from '@/lib/i18n/language-package'
import { TALENT_ICON_CLASS } from '@/lib/assets/talent-images'

interface HeroTalentNotImplementedProps {
  subtitle?: string
}

export function HeroTalentNotImplemented({
  subtitle = 'This awakening skill is not available in the database yet.',
}: HeroTalentNotImplementedProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`${TALENT_ICON_CLASS} flex items-center justify-center rounded-xl border border-dashed border-panel-border bg-panel-hover text-xl font-light text-text-muted`}
        aria-hidden
      >
        —
      </div>
      <div className="min-w-0 pt-1">
        <p className="text-base font-semibold text-text-muted sm:text-lg">{NOT_AVAILABLE_LABEL}</p>
        <p className="mt-1 text-sm leading-relaxed text-text-muted">{subtitle}</p>
      </div>
    </div>
  )
}

export function isNotAvailableLabel(value?: string): boolean {
  return value === NOT_AVAILABLE_LABEL
}

/** @deprecated use isNotAvailableLabel */
export const isNotImplementedLabel = isNotAvailableLabel
