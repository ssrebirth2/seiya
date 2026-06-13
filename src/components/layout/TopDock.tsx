'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Globe, Check, Menu, Hammer } from 'lucide-react'
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
import {
  getSiteLogoDisplayHeight,
  getSiteLogoPath,
  getSiteLogoSpec,
} from '@/lib/i18n/site-logo'
import { DEFAULT_SITE_LANGUAGE, SITE_LANGUAGES } from '@/lib/i18n/site-languages'
import {
  CATALOG_SHORTCUTS,
  TOOLS_SHORTCUTS,
  type FunctionShortcutItem,
} from '@/lib/navigation/function-shortcuts'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { DISCORD_INVITE_URL } from '@/lib/site-links'

type TopDockPanel = 'catalog' | 'tools' | 'lang' | null

function isAnyActive(pathname: string, items: FunctionShortcutItem[]) {
  return items.some((item) => isDockActive(pathname, item.href))
}

function TopDockButton({
  label,
  active,
  open,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  open?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={`dock-bar-btn ${active ? 'dock-bar-btn--active' : ''} ${open ? 'dock-bar-btn--open' : ''}`}
      aria-label={label}
      aria-expanded={open}
      aria-haspopup={onClick ? 'menu' : undefined}
    >
      {children}
    </button>
  )
}

function TopDockShortcutPanel({
  items,
  open,
  onClose,
  anchorRef,
  panelRef,
}: {
  items: FunctionShortcutItem[]
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  panelRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <DockPopover
      open={open}
      anchorRef={anchorRef}
      panelRef={panelRef}
      placement="below"
      align="left"
      className="dock-popover--grid dock-popover--desktop"
    >
      <FunctionShortcutGrid
        items={items}
        variant="dock"
        dockSize="desktop"
        onNavigate={onClose}
      />
    </DockPopover>
  )
}

function TopDockCatalogButton({
  panel,
  setPanel,
  navPillRef,
}: {
  panel: TopDockPanel
  setPanel: (panel: TopDockPanel) => void
  navPillRef: RefObject<HTMLDivElement | null>
}) {
  const pathname = usePathname()
  const { t } = useUiTranslation()
  const slotRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const open = panel === 'catalog'

  useDockDismiss(slotRef, panelRef, open, () => setPanel(null), navPillRef)

  return (
    <div ref={slotRef} className="dock-bar-slot">
      <TopDockButton
        label={t(UI_KEYS.nav.gallery)}
        active={isAnyActive(pathname, CATALOG_SHORTCUTS)}
        open={open}
        onClick={() => setPanel(open ? null : 'catalog')}
      >
        <Menu size={20} strokeWidth={2} aria-hidden="true" />
      </TopDockButton>
      <TopDockShortcutPanel
        items={CATALOG_SHORTCUTS}
        open={open}
        onClose={() => setPanel(null)}
        anchorRef={navPillRef}
        panelRef={panelRef}
      />
    </div>
  )
}

function TopDockToolsButton({
  panel,
  setPanel,
  navPillRef,
}: {
  panel: TopDockPanel
  setPanel: (panel: TopDockPanel) => void
  navPillRef: RefObject<HTMLDivElement | null>
}) {
  const pathname = usePathname()
  const { t } = useUiTranslation()
  const slotRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const open = panel === 'tools'

  useDockDismiss(slotRef, panelRef, open, () => setPanel(null), navPillRef)

  return (
    <div ref={slotRef} className="dock-bar-slot">
      <TopDockButton
        label={t(UI_KEYS.nav.tools)}
        active={isAnyActive(pathname, TOOLS_SHORTCUTS)}
        open={open}
        onClick={() => setPanel(open ? null : 'tools')}
      >
        <Hammer size={20} strokeWidth={2} aria-hidden="true" />
      </TopDockButton>
      <TopDockShortcutPanel
        items={TOOLS_SHORTCUTS}
        open={open}
        onClose={() => setPanel(null)}
        anchorRef={navPillRef}
        panelRef={panelRef}
      />
    </div>
  )
}

function TopDockDiscordLink() {
  const { site } = useUiTranslation()

  return (
    <a
      href={DISCORD_INVITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="dock-bar-btn dock-bar-btn--discord"
      aria-label={site('discordLink')}
    >
      <DiscordIcon size={20} />
    </a>
  )
}

function TopDockLanguageButton({
  panel,
  setPanel,
}: {
  panel: TopDockPanel
  setPanel: (panel: TopDockPanel) => void
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
      <TopDockButton
        label={current.label}
        open={open}
        onClick={() => setPanel(open ? null : 'lang')}
      >
        <Globe size={20} strokeWidth={2} aria-hidden="true" />
      </TopDockButton>

      <DockPopover
        open={open}
        anchorRef={slotRef}
        panelRef={panelRef}
        placement="below"
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

export function TopDock() {
  const pathname = usePathname()
  const { lang } = useLanguage()
  const { t } = useUiTranslation()
  const mounted = useDockMounted()
  const navPillRef = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState<TopDockPanel>(null)
  const homeActive = isDockActive(pathname, '/')
  const siteLogoSpec = getSiteLogoSpec(lang)
  const siteLogoSrc = siteLogoSpec.src
  const siteLogoHeight = getSiteLogoDisplayHeight(siteLogoSpec)

  useEffect(() => {
    setPanel(null)
  }, [pathname])

  if (!mounted) return null

  return createPortal(
    <header className={`top-dock ${panel ? 'top-dock--elevated' : ''}`} role="banner">
        <div className="top-dock__bar">
          <div className="top-dock__inner">
            <nav className="top-dock__nav" aria-label="Main navigation">
              <div ref={navPillRef} className="top-dock__nav-pill">
                <TopDockCatalogButton panel={panel} setPanel={setPanel} navPillRef={navPillRef} />
                <TopDockToolsButton panel={panel} setPanel={setPanel} navPillRef={navPillRef} />
              </div>
            </nav>

            <div className="top-dock__utilities">
              <TopDockDiscordLink />
              <TopDockLanguageButton panel={panel} setPanel={setPanel} />
              <ThemeToggle variant="dock" />
            </div>
          </div>
        </div>

        <Link
          href="/"
          className={`top-dock__hero-brand ${lang === 'CN' ? 'top-dock__hero-brand--cn' : ''} ${homeActive ? 'top-dock__hero-brand--active' : ''}`}
          aria-label="SSRB2 Database home"
          aria-current={homeActive ? 'page' : undefined}
        >
          <img
            src={siteLogoSrc}
            alt=""
            className="top-dock__hero-brand-logo"
            width={siteLogoSpec.width}
            height={siteLogoSpec.height}
            style={{ width: siteLogoSpec.displayWidth, height: siteLogoHeight }}
            decoding="async"
          />
        </Link>
    </header>,
    document.body
  )
}
