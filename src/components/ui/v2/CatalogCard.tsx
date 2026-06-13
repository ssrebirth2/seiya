import Link from 'next/link'
import type { ReactNode } from 'react'

type CatalogCardProps = {
  href: string
  image: ReactNode
  title: ReactNode
  meta?: ReactNode
  chips?: ReactNode
  badge?: ReactNode
  qualityGlow?: number
  className?: string
}

const QUALITY_GLOW: Record<number, string> = {
  2: 'hover:border-quality-r/40',
  3: 'hover:border-quality-sr/50 hover:shadow-[0_8px_24px_rgba(59,130,246,0.15)]',
  4: 'hover:border-quality-ssr/50 hover:shadow-[0_8px_24px_rgba(168,85,247,0.15)]',
  5: 'hover:border-quality-ur/50 hover:shadow-[0_8px_24px_rgba(201,162,39,0.15)]',
}

export function CatalogCard({
  href,
  image,
  title,
  meta,
  chips,
  badge,
  qualityGlow,
  className = '',
}: CatalogCardProps) {
  const glowClass = qualityGlow ? (QUALITY_GLOW[qualityGlow] ?? '') : ''

  return (
    <Link
      href={href}
      className={`catalog-card-link group flex aspect-[3/4] flex-col ${glowClass} ${className}`.trim()}
    >
      <div className="relative flex-1 overflow-hidden rounded-lg bg-panel-hover/50">
        {badge ? <div className="absolute left-1.5 top-1.5 z-10">{badge}</div> : null}
        <div className="flex h-full items-center justify-center p-2">{image}</div>
      </div>
      <div className="mt-2 space-y-1.5 px-0.5">
        <div className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">{title}</div>
        {chips ? <div className="flex flex-wrap justify-center gap-1">{chips}</div> : null}
        {meta ? <div className="truncate text-center text-[10px] text-text-muted">{meta}</div> : null}
      </div>
    </Link>
  )
}
