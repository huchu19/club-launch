import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/cn'

/** Small sentence-case label above a heading, with a short leading rule. */
export function Eyebrow({ className, children, ...props }: ComponentPropsWithoutRef<'p'>) {
  return (
    <p
      className={cn(
        'mb-4 flex items-center gap-3 text-sm font-medium tracking-wide text-brand',
        'before:h-px before:w-8 before:bg-current before:content-[""]',
        className,
      )}
      {...props}
    >
      {children}
    </p>
  )
}
