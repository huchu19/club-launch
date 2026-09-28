'use client'

import { useId, useRef, useState, type KeyboardEvent } from 'react'
import {
  busynessForDay,
  describeLevel,
  formatHour,
  quietestHour,
  type HourlyBusyness,
} from '@/lib/busyness/generator'
import { cn } from '@/lib/cn'
import { weekdays, type OpeningHours, type Space, type Weekday } from '@/lib/content/types'

export type BusynessChartProps = {
  clubSlug: string
  spaces: Space[]
  openingHours: OpeningHours[]
  /** The club's current weekday, chosen on the server. */
  today: Weekday
}

const levelWords = { quiet: 'usually quiet', moderate: 'usually steady', busy: 'usually busy' }

function busiestHour(day: HourlyBusyness) {
  let best: { hour: number; level: number } | null = null
  for (const { hour, level } of day) {
    if (level !== null && (best === null || level > best.level)) best = { hour, level }
  }
  return best
}

export function BusynessChart({ clubSlug, spaces, openingHours, today }: BusynessChartProps) {
  const id = useId()
  const [day, setDay] = useState<Weekday>(today)
  const tabs = useRef<Array<HTMLButtonElement | null>>([])

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const target = {
      ArrowRight: (index + 1) % 7,
      ArrowLeft: (index + 6) % 7,
      Home: 0,
      End: 6,
    }[event.key]
    if (target === undefined) return
    event.preventDefault()
    setDay(weekdays[target]!)
    tabs.current[target]?.focus()
  }

  return (
    <div className="space-y-8">
      <div role="tablist" aria-label="Day of the week" className="flex flex-wrap gap-2">
        {weekdays.map((weekday, index) => (
          <button
            key={weekday}
            ref={(el) => {
              tabs.current[index] = el
            }}
            type="button"
            role="tab"
            id={`${id}-${weekday}`}
            aria-selected={weekday === day}
            aria-controls={`${id}-panel`}
            tabIndex={weekday === day ? 0 : -1}
            onClick={() => setDay(weekday)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'min-h-11 rounded-full border px-4 py-2 transition-colors duration-200 ease-soft',
              weekday === day
                ? 'border-brand bg-brand text-on-brand'
                : 'border-line-strong bg-surface text-ink hover:bg-raised',
            )}
          >
            <span aria-hidden="true">{weekday.slice(0, 3)}</span>
            <span className="sr-only">{weekday}</span>
            {weekday === today ? <span className="ml-1 text-sm opacity-80">· Today</span> : null}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${day}`}
        className="grid gap-x-10 gap-y-12 md:grid-cols-2 xl:grid-cols-3"
      >
        {spaces.map((space) => (
          <SpaceChart
            key={space.id}
            space={space}
            hours={busynessForDay(clubSlug, space, openingHours, day)}
            dayLabel={day === today ? 'today' : `on ${day}`}
          />
        ))}
      </div>
    </div>
  )
}

function SpaceChart({
  space,
  hours,
  dayLabel,
}: {
  space: Space
  hours: HourlyBusyness
  dayLabel: string
}) {
  const captionId = useId()
  const quietest = quietestHour(hours)
  const busiest = busiestHour(hours)
  return (
    <figure aria-labelledby={captionId}>
      <figcaption id={captionId}>
        <span className="block font-medium text-ink">{space.name}</span>
        <span className="block text-sm text-ink-muted">
          {quietest
            ? `Best time ${dayLabel}: ${formatHour(quietest.hour)}, ${levelWords[describeLevel(quietest.level)]}`
            : `Closed ${dayLabel}`}
        </span>
      </figcaption>

      <div aria-hidden="true" className="mt-4">
        <div className="flex h-24 items-end gap-0.5 border-b border-line">
          {hours.map(({ hour, level }) => (
            <div key={hour} className="flex h-full flex-1 items-end justify-center">
              {level === null ? null : (
                <div
                  title={`${formatHour(hour)}: ${levelWords[describeLevel(level)]} (${level}%)`}
                  className={cn(
                    'w-full max-w-6 rounded-t-[4px]',
                    quietest?.hour === hour ? 'bg-brand' : 'bg-line-strong/70',
                  )}
                  style={{ height: `${Math.max(level, 4)}%` }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-1 flex text-xs text-ink-muted tabular-nums">
          {hours.map(({ hour }) => (
            <span key={hour} className="flex-1 text-center">
              {hour % 6 === 0 ? String(hour).padStart(2, '0') : ''}
            </span>
          ))}
        </div>
      </div>

      {busiest && quietest ? (
        <p className="mt-3 text-sm text-ink-muted">
          Busiest around {formatHour(busiest.hour)}; quietest around {formatHour(quietest.hour)}.
        </p>
      ) : null}

      {/* A table ignores the 1px width of sr-only, so the wrapper hides it instead. */}
      <div className="sr-only">
        <table>
          <caption>
            {space.name}, typical busyness {dayLabel} by hour (illustrative)
          </caption>
          <thead>
            <tr>
              <th scope="col">Hour</th>
              <th scope="col">Typical level</th>
            </tr>
          </thead>
          <tbody>
            {hours.map(({ hour, level }) => (
              <tr key={hour}>
                <th scope="row">{formatHour(hour)}</th>
                <td>
                  {level === null ? 'Closed' : `${levelWords[describeLevel(level)]}, ${level}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}
