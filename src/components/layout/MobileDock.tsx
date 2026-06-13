'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Globe, Check, Home, Menu, Hammer } from 'lucide-react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { DiscordIcon } from '@/components/icons/DiscordIcon'
import {
  DockPopover,
  isDockActive,
  useDockDismiss,
  useDockMounted,
} from '@/components/layout/dock-shared'
import { FunctionShortcutGrid } from '@/components/ui/v2/FunctionShortcutGrid'
import { useLanguage } from '@/context/language-context'
import { DEFAULT_SITE_LANGUAGE, SITE_LANGUAGES } from '@/lib/i18n/site-languages'
import {
  CATALOG_SHORTCUTS,
  TOOLS_SHORTCUTS,
  type FunctionShortcutItem,
} from '@/lib/navigation/function-shortcuts'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { DISCORD_INVITE_URL } from '@/lib/site-links'

type DockPanel = 'catalog' | 'tools' | 'lang' | null

function isAnyActive(pathname: string, items: FunctionShortcutItem[]) {
  return items.some((item) => isDockActive(pathname, item.href))
}

function DockBarButton({
  label,
  active,
  open,
  onClick,
  children,
  className = '',
}: {
  label: string
  active?: boolean
  open?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={`dock-bar-btn ${active ? 'dock-bar-btn--active' : ''} ${open ? 'dock-bar-btn--open' : ''} ${className}`}
      aria-label={label}
      aria-expanded={open}
      aria-haspopup={onClick ? 'menu' : undefined}
    >
      {children}
    </button>
  )
}

function DockShortcutPanel({
  items,
  open,
  onClose,
  anchorRef,
  panelRef,
  align,
}: {
  items: FunctionShortcutItem[]
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  panelRef: RefObject<HTMLDivElement | null>
  align: 'left' | 'right'
}) {
  return (
    <DockPopover
      open={open}
      anchorRef={anchorRef}
      panelRef={panelRef}
      placement="above"
      align={align}
      className="dock-popover--grid"
    >
      <FunctionShortcutGrid items={items} variant="dock" onNavigate={onClose} />
    </DockPopover>
  )
}

function DockCatalogButton({
  panel,
  setPanel,
}: {
  panel: DockPanel
  setPanel: (panel: DockPanel) => void
}) {
  const pathname = usePathname()
  const { t } = useUiTranslation()
  const slotRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const open = panel === 'catalog'

  useDockDismiss(slotRef, panelRef, open, () => setPanel(null))

  return (
    <div ref={slotRef} className="dock-bar-slot">
      <DockBarButton
        label={t(UI_KEYS.nav.gallery)}
        active={isAnyActive(pathname, CATALOG_SHORTCUTS)}
        open={open}
        onClick={() => setPanel(open ? null : 'catalog')}
      >
        <Menu size={22} strokeWidth={2} aria-hidden="true" />
      </DockBarButton>
      <DockShortcutPanel
        items={CATALOG_SHORTCUTS}
        open={open}
        onClose={() => setPanel(null)}
        anchorRef={slotRef}
        panelRef={panelRef}
        align="left"
      />
    </div>
  )
}

function DockToolsButton({
  panel,
  setPanel,
}: {
  panel: DockPanel
  setPanel: (panel: DockPanel) => void
}) {
  const pathname = usePathname()
  const { t } = useUiTranslation()
  const slotRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const open = panel === 'tools'

  useDockDismiss(slotRef, panelRef, open, () => setPanel(null))

  return (
    <div ref={slotRef} className="dock-bar-slot">
      <DockBarButton
        label={t(UI_KEYS.nav.tools)}
        active={isAnyActive(pathname, TOOLS_SHORTCUTS)}
        open={open}
        onClick={() => setPanel(open ? null : 'tools')}
      >
        <Hammer size={22} strokeWidth={2} aria-hidden="true" />
      </DockBarButton>
      <DockShortcutPanel
        items={TOOLS_SHORTCUTS}
        open={open}
        onClose={() => setPanel(null)}
        anchorRef={slotRef}
        panelRef={panelRef}
        align="left"
      />
    </div>
  )
}

function DockDiscordLink() {
  const { site } = useUiTranslation()

  return (
    <a
      href={DISCORD_INVITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="dock-bar-btn dock-bar-btn--discord"
      aria-label={site('discordLink')}
    >
      <DiscordIcon size={22} />
    </a>
  )
}

function DockLanguageButton({
  panel,
  setPanel,
}: {
  panel: DockPanel
  setPanel: (panel: DockPanel) => void
}) {
  const { lang, setLang } = useLanguage()
  const slotRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const open = panel === 'lang'

  const current =
    SITE_LANGUAGES.find((l) => l.code === lang) ??
    SITE_LANGUAGES.find((l) => l.code === DEFAULT_SITE_LANGUAGE) ??
    SITE_LANGUAGES[0]

  useDockDismiss(slotRef, panelRef, open, () => setPanel(null))

  return (
    <div ref={slotRef} className="dock-bar-slot">
      <DockBarButton
        label={current.label}
        open={open}
        onClick={() => setPanel(open ? null : 'lang')}
      >
        <Globe size={22} strokeWidth={2} aria-hidden="true" />
      </DockBarButton>

      <DockPopover
        open={open}
        anchorRef={slotRef}
        panelRef={panelRef}
        placement="above"
        align="right"
        className="dock-popover--list"
      >
        <ul className="dock-popover__list">
          {SITE_LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="menuitem"
                aria-selected={lang === l.code}
                onClick={(e) => {
                  e.stopPropagation()
                  setLang(l.code)
                  setPanel(null)
                }}
                className={`dock-popover__option ${lang === l.code ? 'dock-popover__option--active' : ''}`}
              >
                <span className="dock-popover__option-text">{l.label}</span>
                {lang === l.code ? <Check size={16} className="shrink-0 text-accent" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </DockPopover>
    </div>
  )
}

export function MobileDock() {
  const pathname = usePathname()
  const { t } = useUiTranslation()
  const mounted = useDockMounted()
  const [panel, setPanel] = useState<DockPanel>(null)
  const homeActive = isDockActive(pathname, '/')
  const homeLabel = t(UI_KEYS.nav.home)

  useEffect(() => {
    setPanel(null)
  }, [pathname])

  if (!mounted) return null

  return createPortal(
    <nav className={`mobile-dock ${panel ? 'mobile-dock--elevated' : ''}`} aria-label="Main navigation">
        <div className="mobile-dock__bar">
          <Link
            href="/"
            className={`dock-bar-home ${homeActive ? 'dock-bar-home--active' : ''}`}
            aria-label={homeLabel}
            aria-current={homeActive ? 'page' : undefined}
          >
            <Home size={24} strokeWidth={homeActive ? 2.5 : 2} aria-hidden="true" />
          </Link>

          <DockCatalogButton panel={panel} setPanel={setPanel} />
          <DockToolsButton panel={panel} setPanel={setPanel} />
          <DockDiscordLink />
          <DockLanguageButton panel={panel} setPanel={setPanel} />
          <ThemeToggle variant="dock" />
        </div>
    </nav>,
    document.body
  )
}
