import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/cn'
import { Container } from './Container'

export type SectionTone = 'canvas' | 'raised'

export type SectionProps = ComponentPropsWithoutRef<'section'> & {
  tone?: SectionTone
  /** Removes the container so children can go full-bleed. */
  bleed?: boolean
}

/** A page band with generous vertical rhythm (--spacing-section). */
export function Section({ tone = 'canvas', bleed, className, children, ...props }: SectionProps) {
  return (
    <section
      className={cn('py-section', tone === 'raised' ? 'bg-raised' : 'bg-canvas', className)}
      {...props}
    >
      {bleed ? children : <Container>{children}</Container>}
    </section>
  )
}
