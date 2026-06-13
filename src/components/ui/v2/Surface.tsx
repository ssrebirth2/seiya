import type { ReactNode } from 'react'

type SurfaceProps = {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}

export function Surface({ children, className = '', as: Tag = 'div' }: SurfaceProps) {
  return <Tag className={`surface panel ${className}`.trim()}>{children}</Tag>
}
