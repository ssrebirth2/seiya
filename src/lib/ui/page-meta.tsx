'use client'

import { createContext, useContext, useMemo, useState, useCallback, useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/context/language-context'
import { UI_KEYS } from '@/lib/i18n/ui-keys'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'

export type BreadcrumbItem = {
  label: string
  href?: string
}

type PageMetaState = {
  breadcrumbs: BreadcrumbItem[]
  title?: string
}

type PageMetaContextValue = PageMetaState & {
  setPageMeta: (meta: Partial<PageMetaState>) => void
  resetPageMeta: () => void
}

const PageMetaContext = createContext<PageMetaContextValue | null>(null)

const ROUTE_LABELS: Record<string, string> = {
  '/': UI_KEYS.nav.home,
  '/heroes': UI_KEYS.nav.heroes,
  '/artifacts': UI_KEYS.nav.artifacts,
  '/companions': UI_KEYS.nav.companions,
  '/force-cards': UI_KEYS.nav.forceCards,
  '/team-builder': UI_KEYS.nav.teamBuilder,
  '/items': UI_KEYS.nav.items,
}

export function defaultBreadcrumbs(pathname: string, homeLabel: string): BreadcrumbItem[] {
  if (pathname === '/') return []

  const segments = pathname.split('/').filter(Boolean)
  const crumbs: BreadcrumbItem[] = [{ label: homeLabel, href: '/' }]

  let path = ''
  for (let i = 0; i < segments.length; i++) {
    path += `/${segments[i]}`
    const segment = segments[i]
    const isLast = i === segments.length - 1
    if (/^\d+$/.test(segment)) continue

    crumbs.push({
      label: ROUTE_LABELS[path] ?? segment.replace(/-/g, ' '),
      href: isLast ? undefined : path,
    })
  }

  return crumbs
}

function translateBreadcrumbs(
  crumbs: BreadcrumbItem[],
  pathname: string,
  t: (key: string) => string
): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  let routeIdx = 0

  return crumbs.map((crumb, i) => {
    if (i === 0) return crumb
    while (routeIdx < segments.length && /^\d+$/.test(segments[routeIdx])) routeIdx++
    const seg = segments[routeIdx]
    routeIdx++
    const routePath = seg ? `/${seg}` : ''
    const lcKey = ROUTE_LABELS[routePath]
    if (lcKey) return { ...crumb, label: t(lcKey) }
    return crumb
  })
}

export function usePageMetaFromPath(): BreadcrumbItem[] {
  const pathname = usePathname()
  const { t } = useUiTranslation()
  const homeLabel = t(UI_KEYS.nav.home)
  return useMemo(
    () => translateBreadcrumbs(defaultBreadcrumbs(pathname, homeLabel), pathname, t),
    [pathname, homeLabel, t]
  )
}

export function getRouteLcKey(pathname: string): string | undefined {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  for (const [route, key] of Object.entries(ROUTE_LABELS)) {
    if (route !== '/' && pathname.startsWith(`${route}/`)) return key
  }
  return undefined
}

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { lang } = useLanguage()
  const { t } = useUiTranslation()
  const homeLabel = t(UI_KEYS.nav.home)

  const pathBreadcrumbs = useMemo(
    () => translateBreadcrumbs(defaultBreadcrumbs(pathname, homeLabel), pathname, t),
    [pathname, homeLabel, t, lang]
  )

  const [override, setOverride] = useState<Partial<PageMetaState>>({})

  const resetPageMeta = useCallback(() => setOverride({}), [])

  const setPageMeta = useCallback((meta: Partial<PageMetaState>) => {
    setOverride((prev) => ({ ...prev, ...meta }))
  }, [])

  useEffect(() => {
    setOverride({})
  }, [pathname])

  const value = useMemo(
    () => ({
      breadcrumbs: override.breadcrumbs ?? pathBreadcrumbs,
      title: override.title,
      setPageMeta,
      resetPageMeta,
    }),
    [override, pathBreadcrumbs, setPageMeta, resetPageMeta]
  )

  return <PageMetaContext.Provider value={value}>{children}</PageMetaContext.Provider>
}

export function usePageMeta() {
  const ctx = useContext(PageMetaContext)
  const fallbackCrumbs = usePageMetaFromPath()
  if (!ctx) {
    return {
      breadcrumbs: fallbackCrumbs,
      title: undefined,
      setPageMeta: () => {},
      resetPageMeta: () => {},
    }
  }
  return ctx
}

export function SetPageMeta({
  title,
  breadcrumbs,
}: {
  title?: string
  breadcrumbs?: BreadcrumbItem[]
}) {
  const { setPageMeta } = usePageMeta()

  useEffect(() => {
    setPageMeta({ title, breadcrumbs })
  }, [title, breadcrumbs, setPageMeta])

  return null
}
