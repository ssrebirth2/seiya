import { qualityNameKey, forceCardQualityNameKey } from '@/lib/i18n/ui-keys'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { getForceCardQualityToneClass } from '@/lib/game/dynamis-ui'

const HERO_QUALITY_CLASS: Record<number, string> = {
  2: 'quality-badge-r',
  3: 'quality-badge-sr',
  4: 'quality-badge-ssr',
  5: 'quality-badge-ur',
}

type QualityBadgeProps = {
  quality: number
  className?: string
  /** When set, uses force-card color tiers (Green/Blue/…) instead of hero R/SR/SSR/UR. */
  variant?: 'hero' | 'force-card'
}

export function QualityBadge({ quality, className = '', variant = 'hero' }: QualityBadgeProps) {
  const { t } = useUiTranslation()
  const cls =
    variant === 'force-card'
      ? getForceCardQualityToneClass(quality) || 'badge-accent'
      : HERO_QUALITY_CLASS[quality] ?? 'badge-accent'
  const labelKey = variant === 'force-card' ? forceCardQualityNameKey(quality) : qualityNameKey(quality)
  const label = t(labelKey)

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-bold tracking-wide ${cls} ${className}`.trim()}
    >
      {label}
    </span>
  )
}
