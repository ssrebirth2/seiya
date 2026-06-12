'use client'

type CompanionMaterialProps = {
  scoreMin?: number
  scoreMax?: number
}

export default function CompanionMaterial({ scoreMin, scoreMax }: CompanionMaterialProps) {
  return (
    <div className="space-y-4 text-sm">
      <p className="text-text-muted">
        When used as enhancement material, this companion contributes star score based on its
        current progress, within the following bounds:
      </p>
      <dl className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-lg border border-panel-border bg-panel-hover/50 px-3 py-2.5">
          <dt className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Min Score
          </dt>
          <dd className="text-lg font-semibold text-foreground">{scoreMin ?? '—'}</dd>
        </div>
        <div className="rounded-lg border border-panel-border bg-panel-hover/50 px-3 py-2.5">
          <dt className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Max Score
          </dt>
          <dd className="text-lg font-semibold text-foreground">{scoreMax ?? '—'}</dd>
        </div>
      </dl>
    </div>
  )
}
