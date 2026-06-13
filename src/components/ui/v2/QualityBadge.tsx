import { qualityNameKey } from '@/lib/i18n/ui-keys'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'

const QUALITY_CLASS: Record<number, string> = {
  2: 'quality-badge-r',
  3: 'quality-badge-sr',
  4: 'quality-badge-ssr',
  5: 'quality-badge-ur',
}

type QualityBadgeProps = {
  quality: number
  className?: string
}

export function QualityBadge({ quality, className = '' }: QualityBadgeProps) {
  const { t } = useUiTranslation()
  const cls = QUALITY_CLASS[quality] ?? 'badge-accent'
  const label = t(qualityNameKey(quality))

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${cls} ${className}`.trim()}
    >
      {label}
    </span>
  )
}
