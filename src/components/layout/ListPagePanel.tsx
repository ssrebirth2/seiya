import type { ReactNode } from 'react'

type ListPagePanelProps = {
  children: ReactNode
  className?: string
}

/** Standard list pages: panel surface + fade-in (see globals + tailwind theme.extend.animation). */
export function ListPagePanel({ children, className = '' }: ListPagePanelProps) {
  return <div className={`panel animate-fadeIn ${className}`.trim()}>{children}</div>
}
