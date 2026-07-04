'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  resolveUsageHref,
  type GroupedItemUsage,
  type ItemUsageRow,
} from '@/lib/game/load-item-usage'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { useLocalizedHref } from '@/lib/i18n/localized-href'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type ItemUsageSectionProps = {
  groupedUsage: GroupedItemUsage[]
  consumeRefMap: ConsumeRefMap
  embedded?: boolean
  /** Skip collapsible group headers — use when the parent section already has a title. */
  flat?: boolean
  /** For craft ingredient lists: qty is how many of *this* item are required. */
  showIngredientQty?: boolean
}

function usageLabel(row: ItemUsageRow, consumeRefMap: ConsumeRefMap): string {
  const targetId = row.meta?.craft_target_id ?? row.meta?.box_item_id ?? row.source_id
  const sid = typeof targetId === 'number' ? targetId : Number(targetId)
  if (Number.isFinite(sid) && consumeRefMap[String(sid)]?.name) {
    return consumeRefMap[String(sid)].name
  }
  return `${row.source_table} #${row.source_id}`
}

function UsageEntryList({
  group,
  consumeRefMap,
  showIngredientQty = false,
}: {
  group: GroupedItemUsage
  consumeRefMap: ConsumeRefMap
  showIngredientQty?: boolean
}) {
  const { t } = useUiTranslation()
  const localized = useLocalizedHref()

  return (
    <ul className="space-y-2">
      {group.entries.map((row) => {
        const href = resolveUsageHref(row)
        const label = usageLabel(row, consumeRefMap)
        return (
          <li key={row.id} className="flex items-center justify-between gap-4 text-sm">
            {href ? (
              <Link href={localized(href)} className="font-medium hover:text-accent">
                {label}
              </Link>
            ) : (
              <span>{label}</span>
            )}
            {row.qty != null && row.qty > 0 ? (
              <span
                className={`shrink-0 tabular-nums text-text-muted ${
                  showIngredientQty ? 'text-sm font-semibold text-foreground' : 'text-xs'
                }`}
              >
                ×{row.qty.toLocaleString()}
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function UsageGroup({
  group,
  consumeRefMap,
  label,
}: {
  group: GroupedItemUsage
  consumeRefMap: ConsumeRefMap
  label: string
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="item-detail-usage-group">
      <button
        type="button"
        className="item-detail-usage-group__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{label}</span>
        <span className="text-text-muted">({group.entries.length})</span>
      </button>
      {open ? (
        <div className="mt-2">
          <UsageEntryList group={group} consumeRefMap={consumeRefMap} />
        </div>
      ) : null}
    </div>
  )
}

export function ItemUsageSection({
  groupedUsage,
  consumeRefMap,
  embedded = false,
  flat = false,
  showIngredientQty = false,
}: ItemUsageSectionProps) {
  const { t } = useUiTranslation()

  if (!groupedUsage.length) return null

  const content =
    flat && groupedUsage.length === 1 ? (
      <UsageEntryList
        group={groupedUsage[0]}
        consumeRefMap={consumeRefMap}
        showIngredientQty={showIngredientQty}
      />
    ) : flat ? (
      groupedUsage.map((group) => (
        <div key={group.domain} className="item-detail-usage-group">
          {groupedUsage.length > 1 ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t(group.labelKey)}
            </p>
          ) : null}
          <UsageEntryList group={group} consumeRefMap={consumeRefMap} showIngredientQty={showIngredientQty} />
        </div>
      ))
    ) : (
      groupedUsage.map((group) => (
        <UsageGroup
          key={group.domain}
          group={group}
          consumeRefMap={consumeRefMap}
          label={t(group.labelKey)}
        />
      ))
    )

  if (embedded) return <>{content}</>

  return <section className="item-detail-section">{content}</section>
}
