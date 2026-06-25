'use client'

import type { ReactNode } from 'react'

type HeroBondsSectionProps = {
  title?: string
  hint?: string
  children: ReactNode
}

export function HeroBondsSection({ title, hint, children }: HeroBondsSectionProps) {
  return (
    <section className={`hero-bonds-section${title ? '' : ' hero-bonds-section--headless'}`}>
      {title ? (
        <div className="hero-bonds-section__head">
          <h2 className="hero-bonds-section__title">{title}</h2>
          {hint ? <p className="hero-bonds-section__hint">{hint}</p> : null}
        </div>
      ) : null}
      <div className="hero-bonds-section__body">{children}</div>
    </section>
  )
}
