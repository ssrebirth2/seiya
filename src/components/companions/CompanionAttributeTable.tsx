'use client'

import {
  formatAttributeValue,
  type AttributeTriple,
} from '@/lib/game/companion-attributes'

type CompanionAttributeTableProps = {
  title?: string
  attributes: AttributeTriple[]
  emptyMessage?: string
}

export default function CompanionAttributeTable({
  title,
  attributes,
  emptyMessage = 'No attributes.',
}: CompanionAttributeTableProps) {
  if (attributes.length === 0) {
    return <p className="text-sm text-text-muted">{emptyMessage}</p>
  }

  return (
    <div>
      {title && (
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          {title}
        </h3>
      )}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {attributes.map((row, i) => (
          <div
            key={`${row[0]}-${row[1]}-${i}`}
            className="rounded-lg border border-panel-border bg-panel-hover/50 px-3 py-2.5"
          >
            <dd className="text-sm font-semibold leading-snug text-foreground">
              {formatAttributeValue(row)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
