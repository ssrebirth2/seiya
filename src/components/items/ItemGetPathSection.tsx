'use client'

import {
  getPathEntryKey,
  groupItemGetPathsBySource,
  regionsHaveIdenticalGetPaths,
  type ItemGetPathDisplay,
  type ItemGetPathRegionGroup,
  type ItemGetPathSourceRow,
} from '@/lib/game/item-get-path'

type ItemGetPathSectionProps = {
  groups: ItemGetPathRegionGroup[]
}

function PathEntryIcon({ entry }: { entry: ItemGetPathDisplay }) {
  if (!entry.iconUrl) return null
  return (
    <img
      src={entry.iconUrl}
      alt=""
      width={40}
      height={40}
      className="item-get-path-row__icon"
      loading="lazy"
    />
  )
}

function PathEntryBody({ entry }: { entry: ItemGetPathDisplay }) {
  return (
    <div className="item-get-path-row__body">
      <p className="item-get-path-row__name">{entry.name}</p>
    </div>
  )
}

function PathEntryList({ entries }: { entries: ItemGetPathDisplay[] }) {
  return (
    <ul className="item-get-path-list">
      {entries.map((entry) => (
        <li key={getPathEntryKey(entry)} className="item-get-path-row">
          <PathEntryIcon entry={entry} />
          <PathEntryBody entry={entry} />
        </li>
      ))}
    </ul>
  )
}

function RegionBadges({ labels }: { labels: string[] }) {
  return (
    <ul className="item-get-path-regions" aria-label="Server regions">
      {labels.map((label) => (
        <li key={label} className="item-get-path-region-badge">
          {label}
        </li>
      ))}
    </ul>
  )
}

function GroupedPathList({ rows }: { rows: ItemGetPathSourceRow[] }) {
  return (
    <ul className="item-get-path-list">
      {rows.map((row) => (
        <li key={getPathEntryKey(row.entry)} className="item-get-path-row item-get-path-row--grouped">
          <PathEntryIcon entry={row.entry} />
          <div className="item-get-path-row__content">
            <PathEntryBody entry={row.entry} />
            <RegionBadges labels={row.areaLabels} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function ItemGetPathSection({ groups }: ItemGetPathSectionProps) {
  const visible = groups.filter((g) => g.entries.length > 0)
  if (!visible.length) return null

  if (visible.length === 1 || regionsHaveIdenticalGetPaths(visible)) {
    return <PathEntryList entries={visible[0].entries} />
  }

  return <GroupedPathList rows={groupItemGetPathsBySource(visible)} />
}
