'use client'

import type { ReactNode } from 'react'

export type TabItem = {
  id: string
  label: ReactNode
  panel: ReactNode
}

type TabsProps = {
  tabs: TabItem[]
  activeId: string
  onChange: (id: string) => void
  sticky?: boolean
  ariaLabel?: string
  /** Allow tab content (e.g. skill row glow) to extend outside the panel clip. */
  panelOverflow?: 'hidden' | 'visible'
}

export function Tabs({
  tabs,
  activeId,
  onChange,
  sticky = false,
  ariaLabel,
  panelOverflow = 'hidden',
}: TabsProps) {
  return (
    <div
      className={`surface panel ${panelOverflow === 'visible' ? 'overflow-visible' : 'overflow-hidden'} !p-0`}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={`flex scroll-strip-h border-b border-panel-border ${sticky ? 'detail-tabs-sticky' : ''}`}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={`tab-btn ${active ? 'tab-btn-active' : 'tab-btn-inactive'}`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {tabs.map((tab) =>
        tab.id === activeId ? (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            className="p-4 sm:p-6"
          >
            {tab.panel}
          </div>
        ) : null
      )}
    </div>
  )
}
