import type { OpeningHours, ScheduleEntry, Space } from '@/lib/content/types'
import { weekdays } from '@/lib/content/types'
import type { LocalMoment } from '@/lib/time/local-time'

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const toTime = (total: number) =>
  `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`

// "What's on now" for a space, in the club's own time zone. Pure: the current
// instant is passed in, so every case (time zones, clock changes, midnight) is
// unit-tested. Classes don't run past midnight in the timetable, so a class
// belongs to the day it starts on.

export type ScheduledClass = ScheduleEntry & { endsAt: string }

export type SpaceStatus = {
  /** Today's hours for this space (its own, or the club's); undefined when closed all day. */
  hours?: Pick<OpeningHours, 'opens' | 'closes'>
  open: boolean
  /** A class running in this space right now. */
  now?: ScheduledClass
  /** The next class in this space, looking up to a week ahead. */
  next?: ScheduledClass & { isToday: boolean }
}

const withEnd = (entry: ScheduleEntry): ScheduledClass => ({
  ...entry,
  endsAt: toTime(toMinutes(entry.time) + entry.durationMin),
})

export function spaceStatus(
  space: Space,
  club: { openingHours: OpeningHours[]; schedule: ScheduleEntry[] },
  moment: LocalMoment,
): SpaceStatus {
  const ownHours = space.openingHours.find((h) => h.day === moment.day)
  const hours = space.openingHours.length
    ? ownHours
    : club.openingHours.find((h) => h.day === moment.day)
  const open =
    Boolean(hours) &&
    moment.minutes >= toMinutes(hours!.opens) &&
    moment.minutes < toMinutes(hours!.closes)

  const classes = club.schedule.filter((entry) => entry.spaceId === space.id)
  const today = classes
    .filter((entry) => entry.day === moment.day)
    .sort((a, b) => a.time.localeCompare(b.time))
  const running = today.find(
    (entry) =>
      moment.minutes >= toMinutes(entry.time) &&
      moment.minutes < toMinutes(entry.time) + entry.durationMin,
  )

  // Later today first, then the following days in order.
  const startIndex = weekdays.indexOf(moment.day)
  let next: SpaceStatus['next']
  for (let offset = 0; offset < 7 && !next; offset++) {
    const day = weekdays[(startIndex + offset) % 7]!
    const candidate = classes
      .filter(
        (entry) => entry.day === day && (offset > 0 || toMinutes(entry.time) > moment.minutes),
      )
      .sort((a, b) => a.time.localeCompare(b.time))[0]
    if (candidate) next = { ...withEnd(candidate), isToday: offset === 0 }
  }

  return {
    hours: hours ? { opens: hours.opens, closes: hours.closes } : undefined,
    open,
    now: running ? withEnd(running) : undefined,
    next,
  }
}
