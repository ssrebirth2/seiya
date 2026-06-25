type Variant = 'page' | 'grid' | 'force-card-grid' | 'detail' | 'filters'

type LoadingSkeletonProps = {
  variant?: Variant
  count?: number
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton-block ${className}`} aria-hidden="true" />
}

export function LoadingSkeleton({ variant = 'page', count = 12 }: LoadingSkeletonProps) {
  if (variant === 'page') {
    return (
      <div className="surface panel flex flex-col items-center gap-4 py-12" role="status" aria-live="polite">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-4 w-72 max-w-full" />
        <SkeletonBlock className="h-4 w-56 max-w-full" />
      </div>
    )
  }

  if (variant === 'detail') {
    return (
      <div className="page-stack" role="status" aria-live="polite">
        <SkeletonBlock className="h-6 w-32" />
        <SkeletonBlock className="h-44 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <SkeletonBlock className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (variant === 'filters') {
    return (
      <div className="mb-6 flex flex-wrap gap-4" role="status" aria-live="polite">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-14 w-36" />
        ))}
      </div>
    )
  }

  if (variant === 'force-card-grid') {
    return (
      <div className="force-card-catalog-skeleton" role="status" aria-live="polite">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="force-card-catalog-skeleton__card">
            <SkeletonBlock className="force-card-catalog-skeleton__art" />
            <SkeletonBlock className="h-4 w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6"
      role="status"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border border-panel-border p-3">
          <SkeletonBlock className="mx-auto h-32 w-32 rounded-lg" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}
