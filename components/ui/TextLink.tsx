import Link from 'next/link'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/cn'

export type TextLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  /** Visually de-emphasised (e.g. footer links). */
  muted?: boolean
}

/** Inline text link. External links get rel="noopener noreferrer" automatically. */
export function TextLink({ className, muted, href, ...props }: TextLinkProps) {
  const isExternal = typeof href === 'string' && /^https?:\/\//.test(href)
  return (
    <Link
      href={href}
      className={cn(
        'underline decoration-1 underline-offset-4 transition-colors hover:decoration-2',
        muted ? 'text-ink-muted hover:text-ink' : 'text-brand hover:text-brand-strong',
        className,
      )}
      {...(isExternal ? { rel: 'noopener noreferrer' } : {})}
      {...props}
    />
  )
}
