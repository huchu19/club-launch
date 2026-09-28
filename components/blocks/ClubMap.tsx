'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { facilityCategoryLabels, facilityIconPaths } from '@/components/media/FacilityIcon'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { busynessForDay, describeLevel } from '@/lib/busyness/generator'
import { prefillConcierge } from '@/lib/concierge/prefill'
import type {
  ClubMap as ClubMapData,
  OpeningHours,
  ScheduleEntry,
  Space,
} from '@/lib/content/types'
import { place, readingOrder, type Geometry, type PlacedZone } from '@/lib/map/geometry'
import { spaceStatus, type SpaceStatus } from '@/lib/map/whats-on'
import { localMoment } from '@/lib/time/local-time'

export type ClubMapProps = {
  clubName: string
  /** Seeds the illustrative busyness figures. */
  clubSlug: string
  map: ClubMapData
  spaces: Space[]
  schedule: ScheduleEntry[]
  openingHours: OpeningHours[]
  timeZone: string
  /** Id of the page's first-day planner, for "Add to my day". */
  plannerSectionId?: string
  /** Fix the clock (Storybook, tests). Defaults to the real time, read after hydration. */
  now?: Date
}

/** The current time, read on the client only (the page itself is static) and refreshed each minute. */
function useNow(fixed?: Date): Date | null {
  const [now, setNow] = useState<Date | null>(fixed ?? null)
  useEffect(() => {
    if (fixed) return
    const tick = () => setNow(new Date())
    tick()
    const timer = setInterval(tick, 60_000)
    return () => clearInterval(timer)
  }, [fixed])
  return now
}

/**
 * Map labels in drawing units. They are larger on narrow screens, where the
 * drawing is scaled down, and long names wrap onto two lines to fit.
 */
function MapLabel({
  text,
  x,
  y,
  className,
  size = 'text-[44px] sm:text-[30px]',
}: {
  text: string
  x: number
  y: number
  className?: string
  size?: string
}) {
  const words = text.split(' ')
  const lines =
    text.length > 12 && words.length > 1
      ? [
          words.slice(0, Math.ceil(words.length / 2)).join(' '),
          words.slice(Math.ceil(words.length / 2)).join(' '),
        ]
      : [text]
  return (
    <text x={x} y={y} textAnchor="middle" aria-hidden="true" className={cn(size, className)}>
      {lines.map((line, i) => (
        <tspan key={line} x={x} dy={i === 0 ? 0 : '1.15em'}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

function Shape({ geometry, className }: { geometry: Geometry; className?: string }) {
  return geometry.kind === 'rect' ? (
    <rect
      x={geometry.x}
      y={geometry.y}
      width={geometry.w}
      height={geometry.h}
      rx={10}
      vectorEffect="non-scaling-stroke"
      className={className}
    />
  ) : (
    <polygon
      points={geometry.points.map((p) => p.join(',')).join(' ')}
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      className={className}
    />
  )
}

export function ClubMap({
  clubName,
  clubSlug,
  map,
  spaces,
  schedule,
  openingHours,
  timeZone,
  plannerSectionId,
  now: fixedNow,
}: ClubMapProps) {
  const id = useId()
  const floors = map.floors.map((floor) => ({
    name: floor.name,
    zones: readingOrder(
      place(floor.zones).filter((zone) => spaces.some((s) => s.id === zone.spaceId)),
    ),
    features: place(floor.features),
  }))
  const [floorIndex, setFloorIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<'map' | 'list'>('map')
  const [announcement, setAnnouncement] = useState('')
  const zoneRefs = useRef(new Map<string, SVGGElement>())
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const now = useNow(fixedNow)
  const moment = now ? localMoment(now, timeZone) : null
  const floor = floors[floorIndex] ?? floors[0]
  if (!floor) return null

  const spaceOf = (spaceId: string) => spaces.find((s) => s.id === spaceId)
  const statusOf = (space: Space) =>
    moment ? spaceStatus(space, { openingHours, schedule }, moment) : null
  /** Typical busyness for this hour (illustrative), or null when closed or unknown. */
  const busyNowOf = (space: Space) =>
    moment
      ? (busynessForDay(clubSlug, space, openingHours, moment.day).find(
          (h) => h.hour === moment.hour,
        )?.level ?? null)
      : null
  const selected = floor.zones.find((z) => z.spaceId === selectedId)
  const selectedSpace = selected ? spaceOf(selected.spaceId) : undefined
  // Roving tabindex: the selected zone, else the first, is the one Tab stop.
  const tabStop = selected?.spaceId ?? floor.zones[0]?.spaceId

  function select(zone: PlacedZone, focus = false) {
    setSelectedId(zone.spaceId)
    const space = spaceOf(zone.spaceId)
    if (space) setAnnouncement(`${space.name}. ${describeStatus(statusOf(space))}`)
    if (focus) zoneRefs.current.get(zone.spaceId)?.focus()
  }

  function onZoneKeyDown(event: KeyboardEvent<SVGGElement>, index: number) {
    const last = floor!.zones.length - 1
    const target = {
      ArrowRight: index + 1 > last ? 0 : index + 1,
      ArrowDown: index + 1 > last ? 0 : index + 1,
      ArrowLeft: index - 1 < 0 ? last : index - 1,
      ArrowUp: index - 1 < 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key]
    if (target !== undefined) {
      event.preventDefault()
      select(floor!.zones[target]!, true)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      select(floor!.zones[index]!)
    }
  }

  function switchFloor(index: number, focusTab = false) {
    setFloorIndex(index)
    setSelectedId(null)
    setAnnouncement(`${floors[index]?.name} shown.`)
    if (focusTab) tabRefs.current[index]?.focus()
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = floors.length - 1
    const target = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key]
    if (target !== undefined) {
      event.preventDefault()
      switchFloor(target, true)
    }
  }

  function addToDay(space: Space) {
    if (!plannerSectionId) return
    prefillConcierge(`I’d like to spend some time in the ${space.name.toLowerCase()}.`)
    document.getElementById(plannerSectionId)?.scrollIntoView({ block: 'start' })
  }

  const [, , vbWidth = 1000, vbHeight = 640] = map.viewBox.split(' ').map(Number)

  return (
    <div className="space-y-6">
      <p role="status" className="sr-only">
        {announcement}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-4">
        {view === 'map' && floors.length > 1 ? (
          <div role="tablist" aria-label="Floors" className="flex flex-wrap gap-2">
            {floors.map((f, index) => (
              <button
                key={f.name}
                ref={(el) => {
                  tabRefs.current[index] = el
                }}
                type="button"
                role="tab"
                id={`${id}-tab-${index}`}
                aria-selected={index === floorIndex}
                aria-controls={`${id}-panel`}
                tabIndex={index === floorIndex ? 0 : -1}
                onClick={() => switchFloor(index)}
                onKeyDown={(e) => onTabKeyDown(e, index)}
                className={cn(
                  'min-h-11 rounded-full border px-4 py-2 transition-colors duration-200 ease-soft',
                  index === floorIndex
                    ? 'border-brand bg-brand text-on-brand'
                    : 'border-line-strong bg-surface text-ink hover:bg-raised',
                )}
              >
                {f.name}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <Button
          variant="secondary"
          aria-pressed={view === 'list'}
          onClick={() => setView((v) => (v === 'map' ? 'list' : 'map'))}
        >
          {view === 'map' ? 'View as list' : 'View as map'}
        </Button>
      </div>

      {view === 'map' ? (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div
            role="tabpanel"
            id={`${id}-panel`}
            aria-labelledby={floors.length > 1 ? `${id}-tab-${floorIndex}` : undefined}
            aria-label={floors.length > 1 ? undefined : floor.name}
          >
            <svg
              viewBox={map.viewBox}
              role="radiogroup"
              aria-label={`Spaces on the ${floor.name.toLowerCase()} of ${clubName}`}
              className="h-auto w-full overflow-visible"
            >
              <rect
                x={16}
                y={16}
                width={vbWidth - 32}
                height={vbHeight - 32}
                rx={18}
                vectorEffect="non-scaling-stroke"
                className="fill-raised stroke-line-strong"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              {floor.features.map((feature, index) => (
                <g key={`${feature.kind}-${index}`} aria-hidden="true">
                  <Shape
                    geometry={feature.geometry}
                    className={
                      feature.kind === 'garden'
                        ? 'fill-brand-wash stroke-brand/40'
                        : 'fill-canvas stroke-line-strong'
                    }
                  />
                  {feature.label ? (
                    <MapLabel
                      text={feature.label}
                      x={feature.labelAt.x}
                      y={feature.labelAt.y}
                      className="fill-ink-muted italic"
                      size="text-[34px] sm:text-[26px]"
                    />
                  ) : null}
                </g>
              ))}
              {floor.zones.map((zone, index) => {
                const space = spaceOf(zone.spaceId)!
                const on = zone.spaceId === selectedId
                return (
                  <g
                    key={zone.spaceId}
                    ref={(el) => {
                      if (el) zoneRefs.current.set(zone.spaceId, el)
                      else zoneRefs.current.delete(zone.spaceId)
                    }}
                    role="radio"
                    aria-checked={on}
                    aria-label={`${zone.label ?? space.name}, ${facilityCategoryLabels[space.category]}`}
                    tabIndex={zone.spaceId === tabStop ? 0 : -1}
                    onClick={() => select(zone)}
                    onKeyDown={(e) => onZoneKeyDown(e, index)}
                    className="group cursor-pointer outline-none [transform-box:fill-box] motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-soft motion-safe:hover:-translate-y-1 motion-safe:focus-visible:-translate-y-1"
                  >
                    <Shape
                      geometry={zone.geometry}
                      className={cn(
                        'transition-[fill,stroke] duration-200',
                        on
                          ? 'fill-brand-wash stroke-brand [stroke-width:2.5px]'
                          : 'fill-surface stroke-line-strong [stroke-width:1px] group-hover:fill-brand-wash group-hover:stroke-brand',
                        'group-focus-visible:stroke-brand group-focus-visible:[stroke-width:3.5px]',
                      )}
                    />
                    <g
                      transform={`translate(${zone.labelAt.x - 18} ${zone.labelAt.y - 52}) scale(1.5)`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-brand"
                      aria-hidden="true"
                    >
                      {facilityIconPaths(space.category)}
                    </g>
                    <MapLabel
                      text={zone.label ?? space.name}
                      x={zone.labelAt.x}
                      y={zone.labelAt.y + 22}
                      className="fill-ink font-display font-medium"
                    />
                  </g>
                )
              })}
            </svg>
            <p className="mt-3 text-sm text-ink-muted">
              Choose a space, or Tab to the plan and use the arrow keys. The plan is illustrative,
              not to scale.
            </p>
          </div>

          <section
            aria-label="Space details"
            className="min-h-[22rem] rounded-md border border-line bg-canvas p-6"
          >
            {selectedSpace ? (
              <SpaceDetails
                space={selectedSpace}
                floorName={floor.name}
                status={statusOf(selectedSpace)}
                busyNow={busyNowOf(selectedSpace)}
                headingLevel={3}
                onAddToDay={plannerSectionId ? () => addToDay(selectedSpace) : undefined}
              />
            ) : (
              <p className="text-ink-muted">
                Choose a space on the plan to see what it’s for and what’s on there now.
              </p>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-10">
          {floors.map((f) => (
            <section key={f.name} aria-labelledby={`${id}-${f.name}`}>
              <h3 id={`${id}-${f.name}`} className="text-2xl">
                {f.name}
              </h3>
              <ul className="mt-4 grid gap-4 md:grid-cols-2">
                {f.zones.map((zone) => {
                  const space = spaceOf(zone.spaceId)!
                  return (
                    <li key={zone.spaceId} className="rounded-md border border-line bg-canvas p-6">
                      <SpaceDetails
                        space={space}
                        floorName={f.name}
                        status={statusOf(space)}
                        busyNow={busyNowOf(space)}
                        headingLevel={4}
                        onAddToDay={plannerSectionId ? () => addToDay(space) : undefined}
                      />
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function describeStatus(status: SpaceStatus | null): string {
  if (!status) return ''
  const parts = [status.open ? 'Open now.' : 'Closed now.']
  if (status.now) parts.push(`${status.now.name} is on until ${status.now.endsAt}.`)
  if (status.next) {
    parts.push(
      `Next: ${status.next.name} ${status.next.isToday ? 'at' : `on ${status.next.day} at`} ${status.next.time}.`,
    )
  }
  return parts.join(' ')
}

type SpaceDetailsProps = {
  space: Space
  floorName: string
  status: SpaceStatus | null
  busyNow: number | null
  headingLevel: 3 | 4
  onAddToDay?: () => void
}

function SpaceDetails({
  space,
  floorName,
  status,
  busyNow,
  headingLevel,
  onAddToDay,
}: SpaceDetailsProps) {
  const Heading = `h${headingLevel}` as const
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-ink-muted">
          {floorName} · {facilityCategoryLabels[space.category]}
        </p>
        <Heading className="mt-1 text-2xl">{space.name}</Heading>
      </div>
      {space.description ? <p>{space.description}</p> : null}
      <dl className="space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-ink-muted">Today</dt>
          <dd>
            {status === null
              ? 'Checking the time…'
              : status.hours
                ? `${status.hours.opens}–${status.hours.closes} · ${status.open ? 'open now' : 'closed now'}`
                : 'Closed today'}
          </dd>
        </div>
        {status?.now ? (
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-ink-muted">On now</dt>
            <dd>
              {status.now.name}, until {status.now.endsAt}
            </dd>
          </div>
        ) : null}
        {status?.open && busyNow !== null ? (
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-ink-muted">Busy?</dt>
            <dd>
              Usually {describeLevel(busyNow) === 'moderate' ? 'steady' : describeLevel(busyNow)} at
              this time (illustrative)
            </dd>
          </div>
        ) : null}
        {status ? (
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-ink-muted">Next</dt>
            <dd>
              {status.next
                ? `${status.next.name}, ${status.next.isToday ? 'today' : status.next.day} at ${status.next.time}`
                : 'No classes here; drop in any time it’s open'}
            </dd>
          </div>
        ) : null}
      </dl>
      {space.typicalUses.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Good for">
          {space.typicalUses.map((use) => (
            <li key={use} className="rounded-full bg-raised px-3 py-1 text-sm">
              {use}
            </li>
          ))}
        </ul>
      ) : null}
      {onAddToDay ? (
        <Button variant="secondary" onClick={onAddToDay}>
          Add to my day
        </Button>
      ) : null}
    </div>
  )
}
