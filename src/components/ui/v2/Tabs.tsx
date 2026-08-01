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
        className={`ui-tabs__list border-b border-panel-border ${sticky ? 'detail-tabs-sticky' : ''}`}
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
              className={`ui-tabs__tab tab-btn ${active ? 'tab-btn-active' : 'tab-btn-inactive'}`}
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
            className="px-4 pb-4 pt-2.5 sm:px-6 sm:pb-5 sm:pt-3"
          >
            {tab.panel}
          </div>
        ) : null
      )}
    </div>
  )
}
