import type { ReactNode } from 'react'

type StatEntry = {
  key: string
  label: string
  value?: string
  valueNode?: ReactNode
  html?: boolean
}

type StatGridProps = {
  title: string
  entries: StatEntry[]
}

export function StatGrid({ title, entries }: StatGridProps) {
  if (entries.length === 0) return null

  return (
    <section className="surface panel">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">{title}</h2>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {entries.map(({ key, label, value, valueNode, html }) => (
          <div
            key={key}
            className="rounded-lg border border-panel-border bg-panel-hover/50 px-3 py-2.5 transition-colors hover:border-accent-border"
          >
            <dt className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
              {label}
            </dt>
            {valueNode ? (
              <dd className="text-sm leading-snug text-foreground">{valueNode}</dd>
            ) : html ? (
              <dd
                className="text-sm font-semibold leading-snug break-words text-foreground"
                dangerouslySetInnerHTML={{ __html: value ?? '' }}
              />
            ) : (
              <dd className="text-sm font-semibold leading-snug break-words text-foreground">
                {value}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  )
}
