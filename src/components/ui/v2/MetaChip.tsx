'use client'

import type { ReactNode } from 'react'

type MetaChipProps = {
  children: ReactNode
  variant?: 'default' | 'faction' | 'class' | 'stance'
  className?: string
}

const VARIANT_CLASS: Record<NonNullable<MetaChipProps['variant']>, string> = {
  default: '',
  faction: 'meta-chip-faction',
  class: 'meta-chip-class',
  stance: 'meta-chip-stance',
}

export function MetaChip({ children, variant = 'default', className = '' }: MetaChipProps) {
  return (
    <span className={`meta-chip ${VARIANT_CLASS[variant]} ${className}`.trim()}>{children}</span>
  )
}
