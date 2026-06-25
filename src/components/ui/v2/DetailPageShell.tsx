'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { useLocalizedHref } from '@/lib/i18n/localized-href'

type BreadcrumbItem = {
  label: string
  href?: string
}

type DetailPageShellProps = {
  backHref: string
  backLabel?: string
  breadcrumbs?: BreadcrumbItem[]
  title: string
  subtitle?: string
  badge?: ReactNode
  header?: ReactNode
  stats?: ReactNode
  children: ReactNode
}

export function DetailPageShell({
  backHref,
  backLabel,
  breadcrumbs = [],
  title,
  subtitle,
  badge,
  header,
  stats,
  children,
}: DetailPageShellProps) {
  const { t } = useUiTranslation()
  const localized = useLocalizedHref()

  return (
    <div className="page-stack animate-fadeIn">
      <Link
        href={localized(backHref)}
        className="inline-flex w-fit items-center gap-2 text-sm text-text-muted transition hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {backLabel ?? t(UI_KEYS.common.back)}
      </Link>

      {breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-text-muted">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
              {i > 0 ? <span aria-hidden="true">/</span> : null}
              {crumb.href ? (
                <Link href={localized(crumb.href)} className="transition-colors hover:text-accent">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}

      {header}

      {!header ? (
        <div className="flex flex-wrap items-start gap-3">
          {badge}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm leading-relaxed text-text-muted">{subtitle}</p> : null}
          </div>
        </div>
      ) : null}

      {stats}

      {children}
    </div>
  )
}
