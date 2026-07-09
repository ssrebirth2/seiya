'use client'

import type { ItemObtainMode } from '@/lib/game/item-stage-rewards'
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
  obtainModes?: ItemObtainMode[]
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

function ObtainModeRows({ modes }: { modes: ItemObtainMode[] }) {
  return (
    <>
      {modes.map((mode) => (
        <li key={`mode-${mode.levelType}`} className="item-get-path-row">
          <div className="item-get-path-row__body">
            <p className="item-get-path-row__name">{mode.label}</p>
          </div>
        </li>
      ))}
    </>
  )
}

function PathEntryList({
  entries,
  obtainModes = [],
}: {
  entries: ItemGetPathDisplay[]
  obtainModes?: ItemObtainMode[]
}) {
  return (
    <ul className="item-get-path-list">
      {entries.map((entry) => (
        <li key={getPathEntryKey(entry)} className="item-get-path-row">
          <PathEntryIcon entry={entry} />
          <PathEntryBody entry={entry} />
        </li>
      ))}
      <ObtainModeRows modes={obtainModes} />
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

function GroupedPathList({
  rows,
  obtainModes = [],
}: {
  rows: ItemGetPathSourceRow[]
  obtainModes?: ItemObtainMode[]
}) {
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
      <ObtainModeRows modes={obtainModes} />
    </ul>
  )
}

function ObtainModesOnlyList({ modes }: { modes: ItemObtainMode[] }) {
  if (!modes.length) return null
  return (
    <ul className="item-get-path-list">
      <ObtainModeRows modes={modes} />
    </ul>
  )
}

export function ItemGetPathSection({ groups, obtainModes = [] }: ItemGetPathSectionProps) {
  const visible = groups.filter((g) => g.entries.length > 0)

  if (!visible.length) {
    return <ObtainModesOnlyList modes={obtainModes} />
  }

  if (visible.length === 1 || regionsHaveIdenticalGetPaths(visible)) {
    return <PathEntryList entries={visible[0].entries} obtainModes={obtainModes} />
  }

  return <GroupedPathList rows={groupItemGetPathsBySource(visible)} obtainModes={obtainModes} />
}
