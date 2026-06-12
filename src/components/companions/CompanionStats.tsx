'use client'

import { useMemo, useState } from 'react'
import CompanionAttributeTable from './CompanionAttributeTable'
import {
  computeBaseAttributes,
  computeTeamAttributes,
  parseAttributeList,
} from '@/lib/game/companion-attributes'
type SpiritAttrRow = {
  id: number
  spirit_attribute: unknown
  spirit_foundation_attribute: unknown
}

type SpiritStarRow = {
  id: number
  star_min: number
  star_max: number
  spirit_team_attribute?: unknown
  spirit_team_attribute_percent?: unknown
  spirit_team_attribute_sum?: unknown
}

type CompanionStatsProps = {
  initQuality: number
  attrRows: SpiritAttrRow[]
  starIndexList: number[]
  starConfigs: Record<number, SpiritStarRow>
  maxLevel: number
}

export default function CompanionStats({
  initQuality,
  attrRows,
  starIndexList,
  starConfigs,
  maxLevel,
}: CompanionStatsProps) {
  const [quality, setQuality] = useState(initQuality)
  const [level, setLevel] = useState(1)

  const starRange = useMemo(() => {
    for (const starId of starIndexList) {
      const cfg = starConfigs[starId]
      if (cfg) return cfg
    }
    return null
  }, [starIndexList, starConfigs])

  const [star, setStar] = useState(starRange?.star_min ?? 1)

  const attrCfg = attrRows.find((r) => r.id === quality)

  const baseAttrs = useMemo(() => {
    if (!attrCfg) return []
    return computeBaseAttributes(
      parseAttributeList(attrCfg.spirit_foundation_attribute),
      parseAttributeList(attrCfg.spirit_attribute),
      level
    )
  }, [attrCfg, level])

  const teamAttrs = useMemo(() => {
    if (!starRange) return []
    return computeTeamAttributes(
      star,
      starRange.star_min,
      parseAttributeList(starRange.spirit_team_attribute_sum),
      parseAttributeList(starRange.spirit_team_attribute),
      parseAttributeList(starRange.spirit_team_attribute_percent)
    )
  }, [star, starRange])

  const qualityOptions = useMemo(() => {
    const ids = attrRows.map((r) => r.id).sort((a, b) => a - b)
    return ids.length > 0 ? ids : [initQuality]
  }, [attrRows, initQuality])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-[120px] flex-col text-sm">
          <label className="field-label">Quality</label>
          <select
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="control-input"
          >
            {qualityOptions.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[120px] flex-col text-sm">
          <label className="field-label">Level</label>
          <input
            type="range"
            min={1}
            max={maxLevel}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="mt-2"
          />
          <span className="text-xs text-text-muted">{level} / {maxLevel}</span>
        </div>

        {starRange && (
          <div className="flex min-w-[120px] flex-col text-sm">
            <label className="field-label">Star</label>
            <input
              type="range"
              min={starRange.star_min}
              max={starRange.star_max}
              value={star}
              onChange={(e) => setStar(Number(e.target.value))}
              className="mt-2"
            />
            <span className="text-xs text-text-muted">
              {star} ({starRange.star_min}–{starRange.star_max})
            </span>
          </div>
        )}
      </div>

      <CompanionAttributeTable title="Base Attributes" attributes={baseAttrs} />
      <CompanionAttributeTable title="Team Attributes" attributes={teamAttrs} />
    </div>
  )
}
