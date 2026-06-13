'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home } from 'lucide-react'
import { GameFunctionIcon } from '@/components/ui/GameFunctionIcon'
import { I18nLabel } from '@/components/ui/I18nLabel'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'
import type { FunctionShortcutIcon, FunctionShortcutItem } from '@/lib/navigation/function-shortcuts'
import type { FunOpenIconKey } from '@/lib/game/fun-open-icons'

type FunctionShortcutGridProps = {
  items: FunctionShortcutItem[]
  variant?: 'home' | 'dock'
  /** Larger icons for desktop top-dock popover only */
  dockSize?: 'desktop'
  onNavigate?: () => void
  className?: string
}

const ICON_SIZE: Record<NonNullable<FunctionShortcutGridProps['variant']>, number> = {
  home: 80,
  dock: 44,
}

const DOCK_ICON_SIZE = {
  default: 52,
  desktop: 60,
} as const

function isShortcutActive(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))
}

function ShortcutIcon({
  icon,
  size,
  active,
}: {
  icon: FunctionShortcutIcon
  size: number
  active: boolean
}) {
  if (icon === 'lucide-home') {
    return <Home size={Math.round(size * 0.42)} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
  }

  return (
    <GameFunctionIcon
      icon={icon as FunOpenIconKey}
      size={size}
      className={active ? 'game-fun-icon--active' : 'game-fun-icon--shortcut'}
    />
  )
}

export function FunctionShortcutGrid({
  items,
  variant = 'home',
  dockSize,
  onNavigate,
  className = '',
}: FunctionShortcutGridProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useUiTranslation()
  const iconSize =
    variant === 'dock'
      ? DOCK_ICON_SIZE[dockSize === 'desktop' ? 'desktop' : 'default']
      : ICON_SIZE[variant]
  const useMenuItems = variant === 'dock' && !!onNavigate

  const handleDockNavigate = (href: string) => {
    onNavigate?.()
    router.push(href)
  }

  return (
    <ul
      className={`app-shortcut-grid app-shortcut-grid--${variant} ${dockSize === 'desktop' ? 'app-shortcut-grid--dock-desktop' : ''} ${items.length === 1 && variant === 'dock' ? 'app-shortcut-grid--dock-single' : ''} ${className}`.trim()}
      role={useMenuItems ? 'menu' : 'list'}
    >
      {items.map((item) => {
        const active = isShortcutActive(pathname, item.href)
        const label = t(item.lcKey)
        const shortcutClass = `app-shortcut ${active ? 'app-shortcut--active' : ''}`

        const content = (
          <>
            <span className="app-shortcut__icon">
              <ShortcutIcon icon={item.icon} size={iconSize} active={active} />
            </span>
            <span className="app-shortcut__label">
              <I18nLabel text={label} skeletonWidth="3.5rem" />
            </span>
          </>
        )

        return (
          <li key={item.href} className="app-shortcut-grid__cell" role={useMenuItems ? 'none' : undefined}>
            {useMenuItems ? (
              <button
                type="button"
                role="menuitem"
                aria-label={label}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDockNavigate(item.href)
                }}
                className={shortcutClass}
                aria-current={active ? 'page' : undefined}
              >
                {content}
              </button>
            ) : (
              <Link
                href={item.href}
                className={shortcutClass}
                aria-current={active ? 'page' : undefined}
              >
                {content}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}
