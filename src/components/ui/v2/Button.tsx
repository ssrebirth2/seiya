import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'gold'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'border border-accent-border bg-accent text-accent-fg hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent-subtle',
  secondary: 'btn-secondary',
  ghost:
    'border border-transparent bg-transparent text-text-muted hover:bg-panel-hover hover:text-foreground',
  gold: 'btn-tool',
}

export function Button({ variant = 'secondary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none disabled:opacity-50 ${variantClasses[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}
