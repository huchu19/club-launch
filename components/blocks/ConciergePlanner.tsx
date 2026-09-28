'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { TextAreaField } from '@/components/ui/FormField'
import { InlineMessage } from '@/components/ui/InlineMessage'
import { cn } from '@/lib/cn'
import {
  conciergeResponseSchema,
  MESSAGE_MAX_LENGTH,
  type ConciergeRequest,
  type ConciergeResponse,
  type DayPlanView,
} from '@/lib/concierge/protocol'
import { onConciergePrefill } from '@/lib/concierge/prefill'
import { shareDayPlan } from '@/lib/concierge/shared-plan-store'
import { formatPrice } from '@/lib/format'

export type PlanDayResult = ConciergeResponse | { status: 'invalid' | 'error'; message: string }
export type PlanDay = (request: ConciergeRequest) => Promise<PlanDayResult>

const NETWORK_ERROR = 'We couldn’t reach the club just now. Please try again in a moment.'

/** Default transport: POST /api/concierge. */
export const postConciergeRequest: PlanDay = async (request) => {
  try {
    const res = await fetch('/api/concierge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    const data: unknown = await res.json().catch(() => null)
    const parsed = conciergeResponseSchema.safeParse(data)
    if (parsed.success) return parsed.data
    const error = (data as { error?: unknown } | null)?.error
    return {
      status: res.status === 400 ? 'invalid' : 'error',
      message: typeof error === 'string' ? error : NETWORK_ERROR,
    }
  } catch {
    return { status: 'error', message: NETWORK_ERROR }
  }
}

export type ConciergePlannerProps = {
  clubSlug: string
  clubName: string
  chips: string[]
  locale?: string
  currency?: string
  /** Id of the page's tour booking section; "Book a tour for this day" needs one. */
  tourSectionId?: string
  plan?: PlanDay
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'planned'; plan: DayPlanView }
  | { kind: 'notice'; tone: 'info' | 'error'; text: string }

export function ConciergePlanner({
  clubSlug,
  clubName,
  chips,
  locale,
  currency,
  tourSectionId,
  plan = postConciergeRequest,
}: ConciergePlannerProps) {
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [announcement, setAnnouncement] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const resultRef = useRef<HTMLHeadingElement>(null)
  const loading = state.kind === 'loading'

  // Move focus to the new plan once it has rendered, so keyboard and screen
  // reader users land on it.
  useEffect(() => {
    if (state.kind === 'planned') resultRef.current?.focus()
  }, [state])

  // "Add to my day" from the club map: add the space to the message and focus it.
  useEffect(
    () =>
      onConciergePrefill((text) => {
        setState((current) => (current.kind === 'loading' ? current : { kind: 'idle' }))
        setMessage((current) =>
          current.includes(text) ? current : `${current.trim()} ${text}`.trim(),
        )
        requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
      }),
    [],
  )

  const toggle = (chip: string) =>
    setSelected((current) =>
      current.includes(chip) ? current.filter((c) => c !== chip) : [...current, chip],
    )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    const text = message.trim()
    if (!text && selected.length === 0) {
      setFieldError('Tell us a little about your week, or choose one of the options')
      inputRef.current?.focus()
      return
    }
    if (text.length > MESSAGE_MAX_LENGTH) {
      setFieldError(`Keep it to ${MESSAGE_MAX_LENGTH} characters or fewer`)
      inputRef.current?.focus()
      return
    }

    setFieldError(null)
    setState({ kind: 'loading' })
    setAnnouncement('Planning your day. This can take a few seconds.')
    const result = await plan({ clubSlug, message: text, chips: selected })

    switch (result.status) {
      case 'planned':
        setState({ kind: 'planned', plan: result.plan })
        setAnnouncement(
          `Your ${result.plan.day} plan is ready, with ${result.plan.stops.length} stops.`,
        )
        return
      case 'invalid':
        setState({ kind: 'idle' })
        setAnnouncement('')
        setFieldError(result.message)
        inputRef.current?.focus()
        return
      case 'refusal':
        setState({ kind: 'notice', tone: 'info', text: result.message })
        setAnnouncement('')
        return
      default:
        setState({ kind: 'notice', tone: 'error', text: result.message })
        setAnnouncement('')
    }
  }

  function startAgain() {
    setState({ kind: 'idle' })
    setAnnouncement('')
    // Wait for the form to render again before focusing it.
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function bookTour(day: DayPlanView) {
    if (!day.id || !tourSectionId) return
    shareDayPlan({ clubSlug, id: day.id, day: day.day })
    document.getElementById(tourSectionId)?.scrollIntoView({ block: 'start' })
    document.getElementById('tour-name')?.focus({ preventScroll: true })
  }

  return (
    <div>
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {state.kind === 'planned' ? (
        <PlanResult
          day={state.plan}
          headingRef={resultRef}
          locale={locale}
          currency={currency}
          onBookTour={tourSectionId && state.plan.id ? () => bookTour(state.plan) : undefined}
          onStartAgain={startAgain}
        />
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-label={`Plan your first day at ${clubName}`}
          aria-busy={loading || undefined}
          className="space-y-6"
        >
          <TextAreaField
            ref={inputRef}
            id="concierge-message"
            name="message"
            label="Tell us about your week"
            hint="How you like to train, when you work, what helps you unwind. Please don’t include personal details."
            rows={3}
            maxLength={MESSAGE_MAX_LENGTH}
            showCount
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            error={fieldError ?? undefined}
          />

          {chips.length > 0 ? (
            <fieldset>
              <legend className="font-medium text-ink">
                Or choose what sounds like you
                <span className="font-normal text-ink-muted"> (optional)</span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map((chip) => {
                  const on = selected.includes(chip)
                  return (
                    <button
                      key={chip}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(chip)}
                      className={cn(
                        'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-base transition-colors duration-200 ease-soft',
                        on
                          ? 'border-brand bg-brand text-on-brand'
                          : 'border-line-strong bg-surface text-ink hover:bg-raised',
                      )}
                    >
                      {on ? (
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 16 16"
                          className="size-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 8.5 6.5 12 13 4.5" />
                        </svg>
                      ) : null}
                      {chip}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ) : null}

          {state.kind === 'notice' ? (
            <InlineMessage tone={state.tone} live={state.tone === 'error' ? 'assertive' : 'polite'}>
              {state.text}
            </InlineMessage>
          ) : null}

          <Button type="submit" size="lg" aria-disabled={loading || undefined}>
            {loading ? 'Planning your day…' : 'Plan my day'}
          </Button>

          {loading ? <PlanSkeleton /> : null}
        </form>
      )}
    </div>
  )
}

function PlanSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-6 border-l border-line pt-2 pl-6">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="space-y-2">
          <div className="h-4 w-40 rounded-sm bg-raised motion-safe:animate-pulse" />
          <div className="h-3 w-3/4 rounded-sm bg-raised motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  )
}

type PlanResultProps = {
  day: DayPlanView
  headingRef: React.Ref<HTMLHeadingElement>
  locale?: string
  currency?: string
  onBookTour?: () => void
  onStartAgain: () => void
}

export function PlanResult({
  day,
  headingRef,
  locale,
  currency,
  onBookTour,
  onStartAgain,
}: PlanResultProps) {
  const price = (value: string) => formatPrice(value, locale, currency)
  return (
    <div className="space-y-8">
      <div>
        <h3 ref={headingRef} tabIndex={-1} className="text-[clamp(1.5rem,2.6vw,2rem)]">
          Your {day.day} at {day.clubName}
        </h3>
        <p className="mt-3 text-lg text-ink-muted">{day.summary}</p>
      </div>

      <ol
        className="space-y-6 border-l border-line pl-6"
        aria-label={`Your ${day.day}, stop by stop`}
      >
        {day.stops.map((stop, index) => (
          <li
            key={`${stop.time}-${stop.spaceId}`}
            className="relative motion-safe:animate-rise"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <span
              aria-hidden="true"
              className="absolute top-2 -left-[31px] size-3 rounded-full border-2 border-brand bg-surface"
            />
            <p className="flex flex-wrap items-baseline gap-x-3">
              <time className="font-medium text-brand tabular-nums">{stop.time}</time>
              <span className="font-display text-xl text-ink">{stop.activity}</span>
            </p>
            <p className="text-sm text-ink-muted">
              {stop.spaceName}
              {stop.className ? ' · Scheduled class' : ''}
            </p>
            <p className="mt-1">{stop.reason}</p>
          </li>
        ))}
      </ol>

      {day.caveats.length > 0 ? (
        <InlineMessage tone="info" title="Before you go" live="off">
          <ul className="space-y-1">
            {day.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </InlineMessage>
      ) : null}

      {day.recommendedPlan ? (
        <div className="rounded-sm border border-line bg-canvas px-5 py-4">
          <p className="text-sm text-ink-muted">Suggested membership</p>
          <p className="font-display text-2xl text-ink">{day.recommendedPlan.name}</p>
          <p>
            {price(day.recommendedPlan.pricePerMonth)} a month
            {day.recommendedPlan.joiningFee
              ? `, plus a one-off ${price(day.recommendedPlan.joiningFee)} joining fee`
              : ''}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {onBookTour ? (
          <Button size="lg" onClick={onBookTour}>
            Book a tour for this day
          </Button>
        ) : null}
        <Button variant="secondary" size="lg" onClick={onStartAgain}>
          Plan a different day
        </Button>
      </div>

      <p className="text-sm text-ink-muted">
        Suggested automatically from the club’s timetable, which can change. The team will confirm
        everything on your tour.
      </p>
    </div>
  )
}
