'use client'

import { useMemo, useState } from 'react'
import { cosmoPointSpritePath } from '@/lib/assets/cosmo-images'
import type { CosmoPointData, CosmoSenseData } from '@/lib/game/cosmo-types'
import GameImage from '@/components/ui/GameImage'

type Props = {
  sense: CosmoSenseData
  selectedIndex: number
  onSelect: (index: number) => void
}

export default function HeroCosmoStarMap({ sense, selectedIndex, onSelect }: Props) {
  const [scale, setScale] = useState(1)
  const posByIndex = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>()
    sense.positions.forEach((p) => map.set(p.index, { x: p.x, y: p.y }))
    return map
  }, [sense.positions])

  const renderPoint = (point: CosmoPointData) => {
    const pos = posByIndex.get(point.index) ?? posByIndex.get(point.index - 1)
    if (!pos) return null
    const isSelected = point.index === selectedIndex
    const isSpecial = point.type === 2
    return (
      <button
        key={point.id}
        type="button"
        aria-label={`Point ${point.index}`}
        className={`hero-cosmo-point absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform ${
          isSelected ? 'hero-cosmo-point--active z-10 scale-110' : 'z-[1]'
        } ${isSpecial ? 'hero-cosmo-point--special' : ''}`}
        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        onClick={() => onSelect(point.index)}
      >
        {point.pointTex ? (
          <GameImage
            src={cosmoPointSpritePath(point.pointTex)}
            rawSrc={cosmoPointSpritePath(point.pointTex)}
            alt=""
            className="h-7 w-7 object-contain sm:h-8 sm:w-8"
          />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
            {point.index}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="hero-cosmo-star-map space-y-2">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="tab-btn rounded border border-panel-border px-2 py-0.5 text-xs"
          onClick={() => setScale((s) => Math.max(0.7, s - 0.1))}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          className="tab-btn rounded border border-panel-border px-2 py-0.5 text-xs"
          onClick={() => setScale((s) => Math.min(1.4, s + 0.1))}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
      <div className="hero-cosmo-star-map__viewport relative aspect-square w-full overflow-hidden rounded-xl border border-panel-border bg-[var(--hero-cosmo-sky)]">
        <div
          className="hero-cosmo-star-map__canvas absolute inset-0 origin-center"
          style={{ transform: `scale(${scale})` }}
        >
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden>
            {sense.lines.map((line) => {
              const a = posByIndex.get(line.startIndex)
              const b = posByIndex.get(line.endIndex)
              if (!a || !b) return null
              return (
                <line
                  key={line.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className="hero-cosmo-line"
                />
              )
            })}
          </svg>
          {sense.points.map(renderPoint)}
        </div>
      </div>
    </div>
  )
}
