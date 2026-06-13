import type { ReactNode } from 'react'
import { SearchX } from 'lucide-react'

type EmptyStateProps = {
  message: string
  className?: string
  children?: ReactNode
}

export function EmptyState({ message, className = '', children }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`.trim()}
      role="status"
    >
      <SearchX className="text-text-muted opacity-60" size={32} aria-hidden="true" />
      <p className="text-sm text-text-muted">{message}</p>
      {children}
    </div>
  )
}
