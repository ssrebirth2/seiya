import type { SelectHTMLAttributes, ReactNode } from 'react'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  children: ReactNode
}

export function Select({ label, className = '', id, children, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex min-w-[140px] flex-col text-sm">
      {label ? (
        <label htmlFor={selectId} className="field-label">
          {label}
        </label>
      ) : null}
      <select id={selectId} className={`control-input ${className}`.trim()} {...props}>
        {children}
      </select>
    </div>
  )
}
