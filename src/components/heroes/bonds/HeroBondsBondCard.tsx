'use client'

import type { ReactNode } from 'react'

type HeroBondsBondCardProps = {
  name: string
  portraits: ReactNode
  children: ReactNode
  variant?: 'state' | 'fetter'
}

export function HeroBondsBondCard({
  name,
  portraits,
  children,
  variant = 'fetter',
}: HeroBondsBondCardProps) {
  return (
    <article className={`hero-bonds-bond hero-bonds-bond--${variant}`}>
      <h3 className="hero-bonds-bond__name">{name}</h3>
      <div className="hero-bonds-bond__portraits">{portraits}</div>
      <div className="hero-bonds-bond__body">{children}</div>
    </article>
  )
}
