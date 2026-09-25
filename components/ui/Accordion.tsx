import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type AccordionItemData = {
  id: string
  title: ReactNode
  content: ReactNode
  /** Small label after the title, e.g. "New — awaiting review". */
  badge?: ReactNode
  defaultOpen?: boolean
  /** Adds the entrance animation (respects prefers-reduced-motion). */
  animate?: boolean
}

/**
 * Disclosure list built on native <details>/<summary>: keyboard operable,
 * announced as expandable by screen readers, and works without JavaScript.
 */
export function Accordion({
  items,
  className,
  headingLevel = 3,
}: {
  items: AccordionItemData[]
  className?: string
  /** Level of the heading wrapping each question, for document outline. */
  headingLevel?: 2 | 3 | 4
}) {
  if (items.length === 0) return null
  const Heading = `h${headingLevel}` as const
  return (
    <div className={cn('border-y border-line', className)}>
      {items.map((item) => (
        <details
          key={item.id}
          id={item.id}
          open={item.defaultOpen}
          className={cn(
            'group border-b border-line last:border-b-0',
            item.animate && 'animate-rise',
          )}
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 marker:content-none [&::-webkit-details-marker]:hidden">
            <Heading className="font-sans text-lg leading-snug font-medium tracking-normal text-ink">
              {item.title}
              {item.badge ? <span className="ml-3 align-middle">{item.badge}</span> : null}
            </Heading>
            <span
              aria-hidden="true"
              className="relative mt-1.5 size-4 shrink-0 text-brand before:absolute before:top-1/2 before:left-0 before:h-0.5 before:w-4 before:-translate-y-1/2 before:bg-current after:absolute after:top-0 after:left-1/2 after:h-4 after:w-0.5 after:-translate-x-1/2 after:bg-current after:transition-transform after:duration-200 group-open:after:scale-y-0"
            />
          </summary>
          <div className="max-w-prose pb-6 text-ink-muted">{item.content}</div>
        </details>
      ))}
    </div>
  )
}
