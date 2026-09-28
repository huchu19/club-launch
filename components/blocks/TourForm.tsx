'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { CheckboxField, SelectField, TextField } from '@/components/ui/FormField'
import { InlineMessage } from '@/components/ui/InlineMessage'
import {
  clearSharedDayPlan,
  getServerSharedDayPlan,
  getSharedDayPlan,
  subscribeSharedDayPlan,
} from '@/lib/concierge/shared-plan-store'
import {
  createTourRequestSchema,
  addDaysIso,
  MAX_DAYS_AHEAD,
  timeSlotLabels,
  timeSlots,
  todayIso,
  tourFieldErrors,
  type TimeSlot,
  type TourField,
  type TourFieldErrors,
  type TourRequest,
  type TourSubmitResult,
} from '@/lib/tour/schema'

export type SubmitTour = (request: TourRequest) => Promise<TourSubmitResult>

const NETWORK_ERROR =
  'We could not reach the club just now. Your details are still here, so please try again in a moment.'

/** Default transport: POST /api/tour. */
export const postTourRequest: SubmitTour = async (request) => {
  try {
    const res = await fetch('/api/tour', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    const data = (await res.json().catch(() => null)) as {
      reference?: string
      error?: string
      fieldErrors?: TourFieldErrors
    } | null
    if (res.ok && data?.reference) return { ok: true, reference: data.reference }
    if (res.status === 400 && data?.fieldErrors) {
      return { ok: false, kind: 'invalid', fieldErrors: data.fieldErrors }
    }
    return {
      ok: false,
      kind: res.status === 429 ? 'rate-limited' : 'error',
      message: data?.error ?? NETWORK_ERROR,
    }
  } catch {
    return { ok: false, kind: 'error', message: NETWORK_ERROR }
  }
}

type Values = {
  name: string
  email: string
  phone: string
  preferredDate: string
  timeSlot: string
  consent: boolean
  website: string
}

const emptyValues: Values = {
  name: '',
  email: '',
  phone: '',
  preferredDate: '',
  timeSlot: '',
  consent: false,
  website: '',
}

// Error summary order follows the visual order of the fields.
const fieldOrder: TourField[] = ['name', 'email', 'phone', 'preferredDate', 'timeSlot', 'consent']

const fieldId = (field: TourField) => `tour-${field}`

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T12:00:00Z`))
}

export type TourFormProps = {
  clubSlug: string
  clubName: string
  submit?: SubmitTour
}

type Focus = 'summary' | 'failure' | 'success'

export function TourForm({ clubSlug, clubName, submit = postTourRequest }: TourFormProps) {
  const [values, setValues] = useState<Values>(emptyValues)
  const [errors, setErrors] = useState<TourFieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{
    reference: string
    request: TourRequest
    planDay?: string
  } | null>(null)
  // A first-day plan the visitor chose to share from the concierge block.
  const sharedPlan = useSyncExternalStore(
    subscribeSharedDayPlan,
    () => getSharedDayPlan(clubSlug),
    getServerSharedDayPlan,
  )
  const [focusRequest, setFocusRequest] = useState<{ target: Focus; n: number } | null>(null)
  const requestFocus = (target: Focus) =>
    setFocusRequest((previous) => ({ target, n: (previous?.n ?? 0) + 1 }))
  const [today] = useState(() => todayIso())

  const summaryRef = useRef<HTMLDivElement>(null)
  const failureRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)

  // Move focus after the relevant message has rendered (WCAG 3.3.1, 4.1.3).
  useEffect(() => {
    if (!focusRequest) return
    const refs = { summary: summaryRef, failure: failureRef, success: successRef }
    refs[focusRequest.target].current?.focus()
  }, [focusRequest])

  const update = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const parsed = createTourRequestSchema(today).safeParse({
      clubSlug,
      name: values.name,
      email: values.email,
      phone: values.phone || undefined,
      preferredDate: values.preferredDate,
      timeSlot: values.timeSlot,
      consent: values.consent,
      dayPlanId: sharedPlan?.id,
      website: values.website || undefined,
    })

    if (!parsed.success) {
      setErrors(tourFieldErrors(parsed.error))
      setFailure(null)
      requestFocus('summary')
      return
    }

    setErrors({})
    setFailure(null)
    setSubmitting(true)
    const result = await submit(parsed.data)
    setSubmitting(false)

    if (result.ok) {
      setConfirmation({
        reference: result.reference,
        request: parsed.data,
        planDay: sharedPlan?.day,
      })
      clearSharedDayPlan()
      requestFocus('success')
    } else if (result.kind === 'invalid') {
      setErrors(result.fieldErrors)
      requestFocus('summary')
    } else {
      // Input is kept exactly as entered so nothing has to be retyped.
      setFailure(result.message)
      requestFocus('failure')
    }
  }

  function reset() {
    setValues(emptyValues)
    setConfirmation(null)
  }

  if (confirmation) {
    const { request, reference, planDay } = confirmation
    const firstName = request.name.split(/\s+/)[0]
    return (
      <div ref={successRef} tabIndex={-1} className="space-y-6 focus:outline-none">
        <InlineMessage tone="success" title={`Thank you, ${firstName}. Your tour request is in.`}>
          <p>
            The {clubName} team will email {request.email} to confirm{' '}
            {/^[aeiou]/.test(request.timeSlot) ? 'an' : 'a'} {request.timeSlot} visit on{' '}
            {formatDate(request.preferredDate)}.
          </p>
          {planDay ? (
            <p className="mt-2">Your {planDay} plan is attached, so your tour can follow it.</p>
          ) : null}
          <p className="mt-2 text-sm">
            Reference: <span className="font-mono text-ink">{reference}</span>
          </p>
        </InlineMessage>
        <Button variant="secondary" onClick={reset}>
          Request another tour
        </Button>
      </div>
    )
  }

  const errorEntries = fieldOrder
    .map((field) => [field, errors[field]] as const)
    .filter((entry): entry is readonly [TourField, string] => Boolean(entry[1]))

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-describedby="tour-form-intro"
      className="space-y-6"
    >
      <p id="tour-form-intro" className="text-ink-muted">
        All fields are required unless marked optional.
      </p>

      {sharedPlan ? (
        <div className="rounded-sm border-l-4 border-brand bg-brand-wash px-5 py-4">
          <p className="font-medium text-ink">Your {sharedPlan.day} plan is attached</p>
          <p className="mt-1 text-ink-muted">
            The team will see the stops you planned and shape your tour around them. Your message
            isn’t shared.
          </p>
          <Button variant="quiet" className="mt-2" onClick={clearSharedDayPlan}>
            Remove the plan
          </Button>
        </div>
      ) : null}

      {errorEntries.length > 0 ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="tour-error-summary-title"
          className="rounded-sm border-2 border-danger bg-danger-wash p-5 focus:outline-offset-4"
        >
          <h3
            id="tour-error-summary-title"
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
        <div ref={failureRef} tabIndex={-1} className="focus:outline-offset-4">
          <InlineMessage tone="error" title="Your request was not sent">
            {failure}
          </InlineMessage>
        </div>
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
        hint="We only use this to confirm your tour."
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
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          id={fieldId('preferredDate')}
          name="preferredDate"
          type="date"
          label="Preferred date"
          min={today}
          max={addDaysIso(today, MAX_DAYS_AHEAD)}
          value={values.preferredDate}
          onChange={(e) => update('preferredDate', e.target.value)}
          error={errors.preferredDate}
        />
        <SelectField
          id={fieldId('timeSlot')}
          name="timeSlot"
          label="Time of day"
          placeholder="Choose a time"
          options={timeSlots.map((slot: TimeSlot) => ({
            value: slot,
            label: timeSlotLabels[slot],
          }))}
          value={values.timeSlot}
          onChange={(e) => update('timeSlot', e.target.value)}
          error={errors.timeSlot}
        />
      </div>
      <CheckboxField
        id={fieldId('consent')}
        name="consent"
        label={`I agree that ${clubName} can contact me about this tour.`}
        hint="We will not add you to a mailing list."
        checked={values.consent}
        onChange={(e) => update('consent', e.target.checked)}
        error={errors.consent}
      />

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[10000px] size-px overflow-hidden">
        <label htmlFor="tour-website">Website</label>
        <input
          id="tour-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => update('website', e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Button type="submit" size="lg" aria-disabled={submitting || undefined}>
          {submitting ? 'Sending…' : 'Request a tour'}
        </Button>
        <p role="status" className="text-sm text-ink-muted">
          {submitting ? 'Sending your request…' : ''}
        </p>
      </div>
    </form>
  )
}
