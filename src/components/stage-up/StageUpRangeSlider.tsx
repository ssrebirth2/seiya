'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { clampInt } from '@/lib/game/compute-stage-plan'

type StageUpRangeSliderProps = {
  max: number
  from: number
  to: number
  fromLabel: string
  toLabel: string
  onChange: (from: number, to: number) => void
}

type DragHandle = 'from' | 'to'

function pct(value: number, max: number): number {
  if (max <= 0) return 0
  return (value / max) * 100
}

type StageFieldProps = {
  id: string
  label: string
  value: number
  min: number
  max: number
  disabled: boolean
  onCommit: (value: number) => void
}

function StageField({ id, label, value, min, max, disabled, onCommit }: StageFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)

  useEffect(() => {
    setDraft(null)
  }, [value])

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    setDraft(null)
    if (!Number.isFinite(parsed)) return
    const next = clampInt(parsed, min, max)
    if (next !== value) onCommit(next)
  }

  return (
    <div className="stage-up-range__field">
      <input
        id={id}
        className="control-input stage-up-range__input"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        disabled={disabled}
        value={draft ?? String(value)}
        onChange={(event) => setDraft(event.target.value.replace(/[^\d]/g, ''))}
        onBlur={() => commit(draft ?? String(value))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
      />
    </div>
  )
}

export function StageUpRangeSlider({
  max,
  from,
  to,
  fromLabel,
  toLabel,
  onChange,
}: StageUpRangeSliderProps) {
  const groupId = useId()
  const fromId = `${groupId}-from`
  const toId = `${groupId}-to`
  const railRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragHandle | null>(null)
  const canSlide = max > 0
  const fromMax = Math.max(0, to - 1)
  const toMin = Math.min(max, from + 1)

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const rail = railRef.current
      if (!rail || max <= 0) return 0
      const rect = rail.getBoundingClientRect()
      if (rect.width <= 0) return 0
      const ratio = (clientX - rect.left) / rect.width
      return clampInt(Math.round(ratio * max), 0, max)
    },
    [max]
  )

  const applyHandle = useCallback(
    (handle: DragHandle, next: number) => {
      if (handle === 'from') {
        onChange(Math.min(next, to - 1), to)
        return
      }
      onChange(from, Math.max(next, from + 1))
    },
    [from, to, onChange]
  )

  const startDrag = (handle: DragHandle) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!canSlide) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag(handle)
    applyHandle(handle, valueFromClientX(event.clientX))
  }

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return
    applyHandle(drag, valueFromClientX(event.clientX))
  }

  const endDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (drag && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDrag(null)
  }

  const jumpNearest = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSlide) return
    const target = event.target as HTMLElement
    if (target.closest('.stage-up-range__thumb')) return
    const next = valueFromClientX(event.clientX)
    const distFrom = Math.abs(next - from)
    const distTo = Math.abs(next - to)
    applyHandle(distFrom <= distTo ? 'from' : 'to', next)
  }

  const onThumbKey = (handle: DragHandle) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 5 : 1
    const current = handle === 'from' ? from : to
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      applyHandle(handle, current - step)
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      applyHandle(handle, current + step)
    } else if (event.key === 'Home') {
      event.preventDefault()
      applyHandle(handle, handle === 'from' ? 0 : from + 1)
    } else if (event.key === 'End') {
      event.preventDefault()
      applyHandle(handle, handle === 'from' ? to - 1 : max)
    }
  }

  const fromPct = pct(from, max)
  const toPct = pct(to, max)

  return (
    <div className="stage-up-range">
      <div className="stage-up-range__values">
        <StageField
          id={fromId}
          label={fromLabel}
          value={from}
          min={0}
          max={fromMax}
          disabled={!canSlide}
          onCommit={(next) => onChange(next, to)}
        />
        <span className="stage-up-range__arrow" aria-hidden>
          →
        </span>
        <StageField
          id={toId}
          label={toLabel}
          value={to}
          min={toMin}
          max={max}
          disabled={!canSlide}
          onCommit={(next) => onChange(from, next)}
        />
      </div>

      <div className="stage-up-range__slider" onPointerDown={jumpNearest}>
        <div ref={railRef} className="stage-up-range__rail" aria-hidden>
          <div
            className="stage-up-range__fill"
            style={{ left: `${fromPct}%`, width: `${Math.max(0, toPct - fromPct)}%` }}
          />
        </div>
        <button
          type="button"
          className={`stage-up-range__thumb${drag === 'from' ? ' stage-up-range__thumb--active' : ''}`}
          style={{ left: `${fromPct}%` }}
          disabled={!canSlide}
          role="slider"
          aria-label={fromLabel}
          aria-valuemin={0}
          aria-valuemax={fromMax}
          aria-valuenow={from}
          onPointerDown={startDrag('from')}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onThumbKey('from')}
        />
        <button
          type="button"
          className={`stage-up-range__thumb${drag === 'to' ? ' stage-up-range__thumb--active' : ''}`}
          style={{ left: `${toPct}%` }}
          disabled={!canSlide}
          role="slider"
          aria-label={toLabel}
          aria-valuemin={toMin}
          aria-valuemax={max}
          aria-valuenow={to}
          onPointerDown={startDrag('to')}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onThumbKey('to')}
        />
      </div>
    </div>
  )
}
