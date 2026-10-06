import type { ElementType, ReactNode } from 'react'
import type { BilingualEntry } from '../bilingual'

export type BilingualTextProps = {
  entry?: BilingualEntry
  en?: ReactNode
  mi?: ReactNode
  as?: ElementType
  className?: string
  primaryClassName?: string
  secondaryClassName?: string
  ariaLabel?: string
}

export function BilingualText({
  entry,
  en,
  mi,
  as: Component = 'span',
  className = '',
  primaryClassName = '',
  secondaryClassName = '',
  ariaLabel,
}: BilingualTextProps) {
  const enContent = entry ? entry.en : en
  const miContent = entry ? entry.mi : mi

  return (
    <Component
      aria-label={ariaLabel}
      className={`bilingual-stacked ${className}`.trim()}
    >
      <span className={`bilingual-primary ${primaryClassName}`.trim()}>{enContent}</span>
      <span className={`bilingual-secondary ${secondaryClassName}`.trim()}>{miContent}</span>
    </Component>
  )
}
