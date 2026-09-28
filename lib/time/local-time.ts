import type { Weekday } from '@/lib/content/types'

// Wall-clock time in a club's own time zone. Pure: the instant is passed in,
// so tests can cover time zones, clock changes and midnight.

export const DEFAULT_TIME_ZONE = 'Europe/London'

export type LocalMoment = { day: Weekday; time: string; minutes: number; hour: number }

/** The weekday and wall-clock time at `now` in `timeZone`. */
export function localMoment(now: Date, timeZone: string = DEFAULT_TIME_ZONE): LocalMoment {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const hour = Number(part('hour'))
  const minute = Number(part('minute'))
  return {
    day: part('weekday') as Weekday,
    time: `${part('hour')}:${part('minute')}`,
    minutes: hour * 60 + minute,
    hour,
  }
}
