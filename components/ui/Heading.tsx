import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/cn'

export type HeadingLevel = 1 | 2 | 3 | 4
export type HeadingSize = 'display' | 'xl' | 'lg' | 'md'

const sizes: Record<HeadingSize, string> = {
  display: 'text-[clamp(2.5rem,6.5vw,5rem)] leading-[1.02]',
  xl: 'text-[clamp(2rem,4.2vw,3.25rem)]',
  lg: 'text-[clamp(1.5rem,2.6vw,2rem)]',
  md: 'text-xl',
}

const defaultSize: Record<HeadingLevel, HeadingSize> = { 1: 'display', 2: 'xl', 3: 'lg', 4: 'md' }

export type HeadingProps = ComponentPropsWithoutRef<'h2'> & {
  level?: HeadingLevel
  /** Visual size, independent of the semantic level. */
  size?: HeadingSize
}

export function Heading({ level = 2, size, className, ...props }: HeadingProps) {
  const Tag = `h${level}` as const
  return <Tag className={cn('text-ink', sizes[size ?? defaultSize[level]], className)} {...props} />
}
