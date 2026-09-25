import type { ComponentPropsWithoutRef, ElementType } from 'react'
import { cn } from '@/lib/cn'

export type CardProps<T extends ElementType = 'div'> = {
  as?: T
  /** "flat" sits on the page; "raised" adds the short offset shadow. */
  elevation?: 'flat' | 'raised'
} & Omit<ComponentPropsWithoutRef<T>, 'as'>

export function Card<T extends ElementType = 'div'>({
  as,
  elevation = 'flat',
  className,
  ...props
}: CardProps<T>) {
  const Tag = (as ?? 'div') as ElementType
  return (
    <Tag
      className={cn(
        'rounded-md border border-line bg-surface p-6 sm:p-8',
        elevation === 'raised' && 'shadow-[0_4px_0_var(--color-line)]',
        className,
      )}
      {...props}
    />
  )
}
