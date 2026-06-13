'use client'

import { useEffect, useLayoutEffect, useState, type CSSProperties, type RefObject, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function isDockActive(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))
}

/** Defer outside-click listener so the opening click does not immediately close the panel. */
export function useDockDismiss(
  slotRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
  extraRef?: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      const node = e.target as Node
      const inside =
        slotRef.current?.contains(node) ||
        panelRef.current?.contains(node) ||
        extraRef?.current?.contains(node)
      if (!inside) onClose()
    }

    const id = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown)
    }, 100)

    return () => {
      window.clearTimeout(id)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, onClose, slotRef, panelRef, extraRef])
}

function popoverStyle(
  anchorEl: HTMLElement,
  placement: 'above' | 'below',
  align: 'left' | 'center' | 'right'
): CSSProperties {
  const rect = anchorEl.getBoundingClientRect()
  const gap = 10
  const edge = 12

  const style: CSSProperties = {
    position: 'fixed',
    zIndex: 110,
  }

  if (placement === 'below') {
    style.top = rect.bottom + gap
  } else {
    style.bottom = window.innerHeight - rect.top + gap
  }

  if (align === 'center') {
    const center = rect.left + rect.width / 2
    const clamped = Math.min(
      Math.max(center, edge),
      window.innerWidth - edge
    )
    style.left = clamped
    style.transform = 'translateX(-50%)'
  } else if (align === 'right') {
    style.left = 'auto'
    style.right = Math.max(edge, window.innerWidth - rect.right)
  } else {
    style.left = Math.max(edge, Math.min(rect.left, window.innerWidth - edge))
  }

  return style
}

type DockPopoverProps = {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  panelRef?: RefObject<HTMLDivElement | null>
  placement: 'above' | 'below'
  align: 'left' | 'center' | 'right'
  children: ReactNode
  className?: string
}

/** Compact anchored popover — glass card, no full-width sheet. */
export function DockPopover({
  open,
  anchorRef,
  panelRef,
  placement,
  align,
  children,
  className = '',
}: DockPopoverProps) {
  const mounted = useDockMounted()
  const [style, setStyle] = useState<CSSProperties | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setStyle(null)
      return
    }

    const update = () => {
      if (!anchorRef.current) return
      setStyle(popoverStyle(anchorRef.current, placement, align))
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, anchorRef, placement, align])

  if (!mounted || !open || !style) return null

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      className={`dock-popover dock-popover--${placement} ${className}`.trim()}
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  )
}

export function useDockMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted
}
