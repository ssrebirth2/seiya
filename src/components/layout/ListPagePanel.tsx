import type { ReactNode } from 'react'

type ListPagePanelProps = {
  children: ReactNode
  className?: string
}

export function ListPagePanel({ children, className = '' }: ListPagePanelProps) {
  return <div className={`surface panel animate-fadeIn ${className}`.trim()}>{children}</div>
}
