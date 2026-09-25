import Link from 'next/link'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet'
export type ButtonSize = 'md' | 'lg'

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm font-medium leading-tight transition-[background-color,color,box-shadow,transform] duration-200 ease-soft disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60'

const variants: Record<ButtonVariant, string> = {
  // A short offset shadow gives the "printed, pressable" feel from the portfolio.
  primary:
    'bg-brand text-on-brand shadow-[0_3px_0_var(--color-brand-strong)] hover:bg-brand-strong active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-brand-strong)]',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-raised active:translate-y-px',
  quiet: 'text-brand underline decoration-1 underline-offset-4 hover:decoration-2',
}

const sizes: Record<ButtonSize, string> = {
  md: 'px-5 py-2.5 text-base',
  lg: 'px-6 py-3 text-lg',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return cn(base, variants[variant], variant === 'quiet' ? 'px-0 py-0 min-h-0' : sizes[size])
}

type CommonProps = { variant?: ButtonVariant; size?: ButtonSize; children: ReactNode }

export type ButtonProps = CommonProps & ComponentPropsWithoutRef<'button'>

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonClasses(variant, size), className)} {...props} />
}

export type ButtonLinkProps = CommonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, 'className'> & { className?: string }

/** A link styled as a button, for navigation (use Button for actions). */
export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonClasses(variant, size), className)} {...props} />
}
