import { InlineMessage } from '@/components/ui/InlineMessage'
import type { DayPlanView } from '@/lib/concierge/protocol'
import { formatPrice } from '@/lib/format'

export type DayPlanDetailsProps = {
  day: DayPlanView
  locale?: string
  currency?: string
  /** Stagger the stops in (the live planner); off for the shared page. */
  animate?: boolean
  /** Accessible name for the list of stops. */
  listLabel: string
}

/** A day plan's stops, caveats and suggested membership. Shared by the planner and shared pages. */
export function DayPlanDetails({ day, locale, currency, animate, listLabel }: DayPlanDetailsProps) {
  const price = (value: string) => formatPrice(value, locale, currency)
  return (
    <>
      <ol className="space-y-6 border-l border-line pl-6" aria-label={listLabel}>
        {day.stops.map((stop, index) => (
          <li
            key={`${stop.time}-${stop.spaceId}`}
            className={animate ? 'relative motion-safe:animate-rise' : 'relative'}
            style={animate ? { animationDelay: `${index * 90}ms` } : undefined}
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
    </>
  )
}
