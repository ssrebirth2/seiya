'use client'

type I18nLabelProps = {
  text: string
  /** Width of the skeleton placeholder while text is loading. */
  skeletonWidth?: string
  className?: string
  as?: 'span' | 'p' | 'h2' | 'h3'
}

/**
 * Renders translated text, or a subtle skeleton while LC keys are still loading.
 */
export function I18nLabel({
  text,
  skeletonWidth = '5rem',
  className = '',
  as: Tag = 'span',
}: I18nLabelProps) {
  if (!text) {
    return (
      <Tag
        className={`i18n-skeleton inline-block h-[0.9em] align-middle ${className}`}
        style={{ width: skeletonWidth }}
        aria-hidden
      />
    )
  }

  return <Tag className={className}>{text}</Tag>
}
