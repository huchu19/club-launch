import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type MessageTone = 'info' | 'success' | 'error'

const tones: Record<MessageTone, string> = {
  info: 'border-line-strong bg-surface',
  success: 'border-brand bg-brand-wash',
  error: 'border-danger bg-danger-wash',
}

export type InlineMessageProps = {
  tone?: MessageTone
  title?: ReactNode
  children?: ReactNode
  className?: string
  /**
   * Live-region politeness. Errors default to "assertive" (role=alert),
   * others to "polite" (role=status). Use "off" for static messages.
   */
  live?: 'polite' | 'assertive' | 'off'
  id?: string
  tabIndex?: number
}

/** Inline status message. Doubles as the toast-style confirmation for forms. */
export function InlineMessage({
  tone = 'info',
  title,
  children,
  className,
  live,
  id,
  tabIndex,
}: InlineMessageProps) {
  const politeness = live ?? (tone === 'error' ? 'assertive' : 'polite')
  const role = politeness === 'assertive' ? 'alert' : politeness === 'polite' ? 'status' : undefined
  return (
    <div
      id={id}
      role={role}
      tabIndex={tabIndex}
      className={cn('rounded-sm border-l-4 px-5 py-4 text-ink', tones[tone], className)}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      {children ? (
        <div className={cn(title ? 'mt-1' : undefined, 'text-ink-muted')}>{children}</div>
      ) : null}
    </div>
  )
}
