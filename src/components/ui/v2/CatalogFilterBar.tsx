'use client'



import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { SlidersHorizontal, X } from 'lucide-react'

import { DockPopover, useDockDismiss } from '@/components/layout/dock-shared'

import { Button } from '@/components/ui/v2/Button'

import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'



type ActiveFilter = {

  key: string

  label: string

  onRemove: () => void

}



type CatalogFilterBarProps = {

  children: ReactNode

  onClear: () => void

  resultCount?: number

  resultLabel?: string

  activeFilters?: ActiveFilter[]

  searchSlot?: ReactNode

}



const FILTER_PANEL_MIN_HEIGHT = 280



export function CatalogFilterBar({

  children,

  onClear,

  resultCount,

  resultLabel,

  activeFilters = [],

  searchSlot,

}: CatalogFilterBarProps) {

  const { t } = useUiTranslation()

  const [panelOpen, setPanelOpen] = useState(false)

  const [placement, setPlacement] = useState<'above' | 'below'>('below')

  const slotRef = useRef<HTMLDivElement>(null)

  const panelRef = useRef<HTMLDivElement>(null)



  useDockDismiss(slotRef, panelRef, panelOpen, () => setPanelOpen(false))



  useLayoutEffect(() => {

    if (!panelOpen || !slotRef.current) return



    const updatePlacement = () => {

      if (!slotRef.current) return

      const rect = slotRef.current.getBoundingClientRect()

      const spaceBelow = window.innerHeight - rect.bottom - 16

      const spaceAbove = rect.top - 16

      setPlacement(

        spaceBelow >= FILTER_PANEL_MIN_HEIGHT || spaceBelow >= spaceAbove ? 'below' : 'above'

      )

    }



    updatePlacement()

    window.addEventListener('resize', updatePlacement)

    window.addEventListener('scroll', updatePlacement, true)

    return () => {

      window.removeEventListener('resize', updatePlacement)

      window.removeEventListener('scroll', updatePlacement, true)

    }

  }, [panelOpen])



  return (

    <div className="mb-6 space-y-3">

      <div className="flex flex-wrap items-center gap-3">

        <div ref={slotRef} className="catalog-filter-trigger shrink-0">

          <Button

            variant="secondary"

            onClick={() => setPanelOpen((open) => !open)}

            aria-expanded={panelOpen}

            aria-haspopup="dialog"

            className={panelOpen ? 'catalog-filter-trigger__btn--open' : ''}

          >

            <SlidersHorizontal size={16} aria-hidden="true" />

            {t(UI_KEYS.filter.filter)}

            {activeFilters.length > 0 ? (

              <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-fg">

                {activeFilters.length}

              </span>

            ) : null}

          </Button>



          <DockPopover

            open={panelOpen}

            anchorRef={slotRef}

            panelRef={panelRef}

            placement={placement}

            align="left"

            className="dock-popover--filters scroll-panel-y"

          >

            <div className="catalog-filter-popover__header">

              <p className="dock-popover__title catalog-filter-popover__title">

                {t(UI_KEYS.filter.filter)}

              </p>

              <button

                type="button"

                onClick={() => setPanelOpen(false)}

                className="catalog-filter-popover__close"

                aria-label={t(UI_KEYS.common.back)}

              >

                <X size={16} aria-hidden="true" />

              </button>

            </div>



            <div className="catalog-filter-popover__fields">{children}</div>



            <div className="catalog-filter-popover__footer">

              <Button

                variant="ghost"

                onClick={onClear}

                className="catalog-filter-popover__clear !px-2 !py-1"

              >

                {t(UI_KEYS.filter.clearAll)}

              </Button>

            </div>

          </DockPopover>

        </div>



        {searchSlot ? <div className="min-w-[12rem] flex-1">{searchSlot}</div> : null}



        {resultCount !== undefined && resultLabel ? (

          <span className="ml-auto text-sm text-text-muted">

            {resultCount} {resultLabel}

          </span>

        ) : null}

      </div>



      {activeFilters.length > 0 ? (

        <div className="flex flex-wrap gap-2">

          {activeFilters.map((f) => (

            <button

              key={f.key}

              type="button"

              onClick={f.onRemove}

              className="meta-chip inline-flex items-center gap-1 pr-1 transition hover:bg-panel-hover"

            >

              {f.label}

              <X size={12} className="opacity-60" />

            </button>

          ))}

        </div>

      ) : null}

    </div>

  )

}


