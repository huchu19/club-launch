import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/cn'

// Labelled, described and error-annotated form controls (WCAG 1.3.1, 3.3.1, 3.3.2).
// Optional fields are marked "(optional)" rather than marking required ones.

type FieldBaseProps = {
  id: string
  label: ReactNode
  hint?: ReactNode
  error?: string
  optional?: boolean
  className?: string
}

function describedBy(id: string, hint?: ReactNode, error?: string) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}

const controlBase =
  'block w-full rounded-sm border bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-muted/80 transition-colors'

function controlClasses(error?: string) {
  return cn(
    controlBase,
    error ? 'border-danger border-2' : 'border-line-strong hover:border-ink-muted',
  )
}

function Label({ id, label, optional }: { id: string; label: ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={id} className="block font-medium text-ink">
      {label}
      {optional ? <span className="font-normal text-ink-muted"> (optional)</span> : null}
    </label>
  )
}

function Hint({ id, hint }: { id: string; hint?: ReactNode }) {
  if (!hint) return null
  return (
    <p id={`${id}-hint`} className="text-sm text-ink-muted">
      {hint}
    </p>
  )
}

function ErrorText({ id, error }: { id: string; error?: string }) {
  if (!error) return null
  return (
    <p id={`${id}-error`} className="flex items-start gap-2 text-sm font-medium text-danger">
      <span aria-hidden="true">!</span>
      <span>
        <span className="sr-only">Error: </span>
        {error}
      </span>
    </p>
  )
}

export type TextFieldProps = FieldBaseProps &
  Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'className'>

export function TextField({
  id,
  label,
  hint,
  error,
  optional,
  className,
  ...input
}: TextFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label id={id} label={label} optional={optional} />
      <Hint id={id} hint={hint} />
      <ErrorText id={id} error={error} />
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={controlClasses(error)}
        {...input}
      />
    </div>
  )
}

export type TextAreaFieldProps = FieldBaseProps &
  Omit<ComponentPropsWithoutRef<'textarea'>, 'id' | 'className'> & {
    /** Shows "n of max characters" under the field when maxLength is set. */
    showCount?: boolean
  }

export function TextAreaField({
  id,
  label,
  hint,
  error,
  optional,
  className,
  showCount,
  ...textarea
}: TextAreaFieldProps) {
  const length = typeof textarea.value === 'string' ? textarea.value.length : 0
  return (
    <div className={cn('space-y-2', className)}>
      <Label id={id} label={label} optional={optional} />
      <Hint id={id} hint={hint} />
      <ErrorText id={id} error={error} />
      <textarea
        id={id}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClasses(error), 'resize-y')}
        {...textarea}
      />
      {showCount && textarea.maxLength ? (
        <p className="text-right text-sm text-ink-muted" aria-live="off">
          {length} of {textarea.maxLength} characters
        </p>
      ) : null}
    </div>
  )
}

export type SelectOption = { value: string; label: string }

export type SelectFieldProps = FieldBaseProps &
  Omit<ComponentPropsWithoutRef<'select'>, 'id' | 'className'> & {
    options: SelectOption[]
    /** Text for an empty first option, e.g. "Choose a time". */
    placeholder?: string
  }

export function SelectField({
  id,
  label,
  hint,
  error,
  optional,
  className,
  options,
  placeholder,
  ...select
}: SelectFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label id={id} label={label} optional={optional} />
      <Hint id={id} hint={hint} />
      <ErrorText id={id} error={error} />
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cn(controlClasses(error), 'appearance-none pr-10')}
          {...select}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 size-2.5 -translate-y-3/4 rotate-45 border-r-2 border-b-2 border-ink-muted"
        />
      </div>
    </div>
  )
}

export type CheckboxFieldProps = Omit<FieldBaseProps, 'optional'> &
  Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'className' | 'type'>

export function CheckboxField({ id, label, hint, error, className, ...input }: CheckboxFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <ErrorText id={id} error={error} />
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cn(
            'mt-1 size-5 shrink-0 cursor-pointer rounded-sm accent-brand',
            error && 'outline-2 outline-offset-2 outline-danger',
          )}
          {...input}
        />
        <div className="space-y-1">
          <label htmlFor={id} className="cursor-pointer text-ink">
            {label}
          </label>
          <Hint id={id} hint={hint} />
        </div>
      </div>
    </div>
  )
}
