'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './Button'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
  /** Accessible description id (optional). */
  describedBy?: string
}

export function Modal({ open, onClose, title, children, className = '', describedBy }: ModalProps) {
  const { site } = useUiTranslation()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = requestAnimationFrame(() => {
      panelRef.current?.focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const closeLabel = site('close')

  return createPortal(
    <div className="ui-modal" role="presentation">
      <button
        type="button"
        className="ui-modal__backdrop overlay-backdrop-strong"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`ui-modal__panel surface panel ${className}`.trim()}
      >
        <header className="ui-modal__header">
          <h2 id={titleId} className="ui-modal__title">
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            className="ui-modal__close"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <X size={18} aria-hidden />
          </Button>
        </header>
        <div className="ui-modal__body scroll-panel-y">{children}</div>
      </div>
    </div>,
    document.body
  )
}
