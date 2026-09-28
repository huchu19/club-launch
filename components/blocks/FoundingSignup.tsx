'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { CheckboxField, TextField } from '@/components/ui/FormField'
import { InlineMessage } from '@/components/ui/InlineMessage'
import {
  foundingFieldErrors,
  foundingSignupSchema,
  foundingStatusSchema,
  type FoundingField,
  type FoundingFieldErrors,
  type FoundingSignup,
  type FoundingSubmitResult,
} from '@/lib/founding/schema'

export type SubmitFounding = (signup: FoundingSignup) => Promise<FoundingSubmitResult>
export type FetchPlacesLeft = (clubSlug: string) => Promise<number | null>

const NETWORK_ERROR =
  'We could not reach the club just now. Your details are still here, so please try again in a moment.'

/** Default transport: POST /api/founding. */
export const postFoundingSignup: SubmitFounding = async (signup) => {
  try {
    const res = await fetch('/api/founding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signup),
    })
    const data = (await res.json().catch(() => null)) as {
      reference?: string
      placesLeft?: number
      error?: string
      soldOut?: boolean
      fieldErrors?: FoundingFieldErrors
    } | null
    if (res.ok && data?.reference) {
      return { ok: true, reference: data.reference, placesLeft: data.placesLeft ?? 0 }
    }
    if (res.status === 400 && data?.fieldErrors) {
      return { ok: false, kind: 'invalid', fieldErrors: data.fieldErrors }
    }
    if (data?.soldOut) return { ok: false, kind: 'sold-out', message: data.error ?? '' }
    return {
      ok: false,
      kind: res.status === 429 ? 'rate-limited' : 'error',
      message: data?.error ?? NETWORK_ERROR,
    }
  } catch {
    return { ok: false, kind: 'error', message: NETWORK_ERROR }
  }
}

/** Default live count: GET /api/founding. Null if it can't be read. */
export const fetchPlacesLeft: FetchPlacesLeft = async (clubSlug) => {
  try {
    const res = await fetch(`/api/founding?club=${encodeURIComponent(clubSlug)}`, {
      cache: 'no-store',
    })
    const parsed = foundingStatusSchema.safeParse(await res.json())
    return parsed.success ? parsed.data.placesLeft : null
  } catch {
    return null
  }
}

const fieldOrder: FoundingField[] = ['name', 'email', 'phone', 'consent']
const fieldId = (field: FoundingField) => `founding-${field}`

export type FoundingSignupProps = {
  clubSlug: string
  clubName: string
  totalPlaces: number
  /** Places left when the page was rendered; refreshed from the server after load. */
  initialPlacesLeft: number
  tourHref?: string
  submit?: SubmitFounding
  loadPlacesLeft?: FetchPlacesLeft
}

type Values = { name: string; email: string; phone: string; consent: boolean; website: string }
const empty: Values = { name: '', email: '', phone: '', consent: false, website: '' }

export function FoundingSignup({
  clubSlug,
  clubName,
  totalPlaces,
  initialPlacesLeft,
  tourHref,
  submit = postFoundingSignup,
  loadPlacesLeft = fetchPlacesLeft,
}: FoundingSignupProps) {
  const [left, setLeft] = useState(initialPlacesLeft)
  const [values, setValues] = useState<Values>(empty)
  const [errors, setErrors] = useState<FoundingFieldErrors>({})
  const [failure, setFailure] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  // The page is static, so fetch the live count once it has loaded.
  useEffect(() => {
    let cancelled = false
    loadPlacesLeft(clubSlug).then((live) => {
      if (!cancelled && live !== null) setLeft(live)
    })
    return () => {
      cancelled = true
    }
  }, [clubSlug, loadPlacesLeft])

  const update = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const parsed = foundingSignupSchema.safeParse({
      clubSlug,
      name: values.name,
      email: values.email,
      phone: values.phone || undefined,
      consent: values.consent,
      website: values.website || undefined,
    })
    if (!parsed.success) {
      setErrors(foundingFieldErrors(parsed.error))
      setFailure(null)
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setErrors({})
    setFailure(null)
    setSubmitting(true)
    const result = await submit(parsed.data)
    setSubmitting(false)
    if (result.ok) {
      setLeft(result.placesLeft)
      setReference(result.reference)
      requestAnimationFrame(() => resultRef.current?.focus())
    } else if (result.kind === 'invalid') {
      setErrors(result.fieldErrors)
      requestAnimationFrame(() => summaryRef.current?.focus())
    } else if (result.kind === 'sold-out') {
      setLeft(0)
    } else {
      setFailure(result.message)
    }
  }

  const taken = Math.max(0, totalPlaces - left)
  const counter = (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-5xl font-semibold tracking-tight text-ink">{left}</span>
        <span className="text-ink-muted">
          of {totalPlaces} founding {left === 1 ? 'place' : 'places'} left
        </span>
      </p>
      <div
        role="meter"
        aria-label="Founding places taken"
        aria-valuemin={0}
        aria-valuemax={totalPlaces}
        aria-valuenow={taken}
        aria-valuetext={`${taken} of ${totalPlaces} places taken`}
        className="mt-4 h-2 rounded-full bg-raised"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-300 ease-soft"
          style={{ width: `${(taken / totalPlaces) * 100}%` }}
        />
      </div>
    </div>
  )

  if (reference) {
    return (
      <div className="space-y-8">
        {counter}
        <div ref={resultRef} tabIndex={-1} className="focus:outline-none">
          <InlineMessage tone="success" title={`Your founding place at ${clubName} is held.`}>
            <p>The team will email {values.email} with the next steps before the club opens.</p>
            <p className="mt-2 text-sm">
              Reference: <span className="font-mono text-ink">{reference}</span>
            </p>
          </InlineMessage>
        </div>
      </div>
    )
  }

  if (left === 0) {
    return (
      <div className="space-y-8">
        {counter}
        <InlineMessage tone="info" title="All the founding places have gone">
          <p>
            Thank you for your interest. You can still see the club before it opens
            {tourHref ? (
              <>
                {' '}
                by{' '}
                <a href={tourHref} className="text-brand underline underline-offset-4">
                  booking a preview tour
                </a>
              </>
            ) : null}
            .
          </p>
        </InlineMessage>
      </div>
    )
  }

  const errorEntries = fieldOrder
    .map((field) => [field, errors[field]] as const)
    .filter((entry): entry is readonly [FoundingField, string] => Boolean(entry[1]))

  return (
    <div className="space-y-8">
      {counter}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6"
        aria-label="Founding membership signup"
      >
        <p className="text-ink-muted">All fields are required unless marked optional.</p>
        {errorEntries.length > 0 ? (
          <div
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            aria-labelledby="founding-error-summary-title"
            className="rounded-sm border-2 border-danger bg-danger-wash p-5 focus:outline-offset-4"
          >
            <h3
              id="founding-error-summary-title"
              className="font-sans text-lg font-medium tracking-normal"
            >
              There is a problem
            </h3>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {errorEntries.map(([field, message]) => (
                <li key={field}>
                  <a
                    href={`#${fieldId(field)}`}
                    className="font-medium text-danger underline underline-offset-4"
                    onClick={(e) => {
                      e.preventDefault()
                      document.getElementById(fieldId(field))?.focus()
                    }}
                  >
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {failure ? (
          <InlineMessage tone="error" title="Your place was not saved">
            {failure}
          </InlineMessage>
        ) : null}
        <TextField
          id={fieldId('name')}
          name="name"
          label="Full name"
          autoComplete="name"
          value={values.name}
          onChange={(e) => update('name', e.target.value)}
          error={errors.name}
          maxLength={100}
        />
        <TextField
          id={fieldId('email')}
          name="email"
          type="email"
          label="Email address"
          autoComplete="email"
          spellCheck={false}
          value={values.email}
          onChange={(e) => update('email', e.target.value)}
          error={errors.email}
        />
        <TextField
          id={fieldId('phone')}
          name="phone"
          type="tel"
          label="Phone number"
          optional
          autoComplete="tel"
          value={values.phone}
          onChange={(e) => update('phone', e.target.value)}
          error={errors.phone}
          maxLength={30}
        />
        <CheckboxField
          id={fieldId('consent')}
          name="consent"
          label={`I agree that ${clubName} can contact me about founding membership.`}
          hint="We will not add you to a mailing list."
          checked={values.consent}
          onChange={(e) => update('consent', e.target.checked)}
          error={errors.consent}
        />
        {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
        <div aria-hidden="true" className="absolute -left-[10000px] size-px overflow-hidden">
          <label htmlFor="founding-website">Website</label>
          <input
            id="founding-website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(e) => update('website', e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" aria-disabled={submitting || undefined}>
          {submitting ? 'Saving your place…' : 'Hold my founding place'}
        </Button>
      </form>
    </div>
  )
}
