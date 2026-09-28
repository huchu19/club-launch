import type { FacilityCategory, OpeningHours, Space, Weekday } from '@/lib/content/types'

// ILLUSTRATIVE busyness: typical occupancy (0–100) for each space, hour and
// weekday, simulated with a realistic shape. In production this would come
// from gate-entry or booking data. Deterministic: the same club and space
// always give the same numbers, so server and browser agree and tests are
// stable.

export const FIRST_HOUR = 6
export const LAST_HOUR = 22

type Curve = Array<[hour: number, level: number]>

// Typical shapes by kind of space, as control points joined by straight lines.
const weekdayCurves: Record<FacilityCategory, Curve> = {
  gym: [
    [6, 55],
    [7, 85],
    [9, 60],
    [12, 55],
    [14, 22],
    [16, 30],
    [18, 92],
    [20, 60],
    [22, 20],
  ],
  studio: [
    [6, 40],
    [7, 80],
    [9, 55],
    [12, 50],
    [14, 18],
    [16, 25],
    [18, 85],
    [20, 55],
    [22, 15],
  ],
  pool: [
    [6, 70],
    [8, 55],
    [10, 30],
    [12, 55],
    [14, 20],
    [17, 45],
    [19, 60],
    [22, 15],
  ],
  spa: [
    [6, 10],
    [9, 20],
    [12, 35],
    [15, 30],
    [18, 75],
    [20, 88],
    [22, 40],
  ],
  recovery: [
    [6, 15],
    [9, 25],
    [12, 30],
    [15, 25],
    [18, 80],
    [20, 70],
    [22, 25],
  ],
  cowork: [
    [6, 5],
    [8, 40],
    [10, 72],
    [12, 50],
    [14, 75],
    [17, 60],
    [19, 25],
    [22, 5],
  ],
  food: [
    [6, 10],
    [8, 55],
    [10, 35],
    [12, 85],
    [14, 60],
    [16, 25],
    [19, 45],
    [22, 10],
  ],
}

// Weekends: later mornings, busier afternoons, and the spa busiest of all.
const weekendCurves: Record<FacilityCategory, Curve> = {
  gym: [
    [7, 25],
    [9, 70],
    [11, 80],
    [13, 55],
    [15, 45],
    [17, 50],
    [19, 30],
    [21, 15],
  ],
  studio: [
    [7, 20],
    [9, 75],
    [11, 70],
    [13, 35],
    [15, 30],
    [17, 45],
    [19, 20],
    [21, 10],
  ],
  pool: [
    [7, 30],
    [10, 75],
    [12, 70],
    [14, 60],
    [16, 55],
    [18, 35],
    [21, 15],
  ],
  spa: [
    [7, 15],
    [10, 50],
    [13, 80],
    [16, 90],
    [18, 85],
    [21, 45],
  ],
  recovery: [
    [7, 15],
    [10, 45],
    [13, 70],
    [16, 80],
    [18, 70],
    [21, 30],
  ],
  cowork: [
    [8, 10],
    [10, 30],
    [13, 35],
    [16, 25],
    [18, 10],
  ],
  food: [
    [8, 30],
    [10, 70],
    [12, 85],
    [14, 70],
    [17, 40],
    [20, 25],
  ],
}

/** Linear interpolation between control points. */
function sample(curve: Curve, hour: number): number {
  const [first] = curve
  const last = curve.at(-1)!
  if (hour <= first![0]) return first![1]
  if (hour >= last[0]) return last[1]
  for (let i = 1; i < curve.length; i++) {
    const [h1, v1] = curve[i]!
    const [h0, v0] = curve[i - 1]!
    if (hour <= h1) return v0 + ((v1 - v0) * (hour - h0)) / (h1 - h0)
  }
  return last[1]
}

/** A small, fast, seeded pseudo-random generator (mulberry32). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A stable 32-bit hash of a string (FNV-1a). */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

const isWeekend = (day: Weekday) => day === 'Saturday' || day === 'Sunday'
const hourOf = (time: string) => Number(time.slice(0, 2)) + Number(time.slice(3, 5)) / 60

export type HourlyBusyness = Array<{ hour: number; level: number | null }>

/**
 * Typical busyness for each hour from 06:00 to 21:00 on one day: a level from
 * 0 to 100 in steps of 5, or null when the space is closed that hour.
 */
export function busynessForDay(
  clubSlug: string,
  space: Pick<Space, 'id' | 'category' | 'openingHours'>,
  clubHours: OpeningHours[],
  day: Weekday,
): HourlyBusyness {
  const hours =
    (space.openingHours.length ? space.openingHours : clubHours).find((h) => h.day === day) ??
    undefined
  const curve = (isWeekend(day) ? weekendCurves : weekdayCurves)[space.category]
  const random = seededRandom(hashSeed(`${clubSlug}:${space.id}:${day}`))
  const result: HourlyBusyness = []
  for (let hour = FIRST_HOUR; hour < LAST_HOUR; hour++) {
    const noise = (random() - 0.5) * 16 // ±8, drawn every hour so the sequence is stable
    const open = hours && hour >= hourOf(hours.opens) && hour + 1 <= hourOf(hours.closes) + 0.5
    const level = Math.round(Math.min(100, Math.max(0, sample(curve, hour) + noise)) / 5) * 5
    result.push({ hour, level: open ? level : null })
  }
  return result
}

export type BusynessLevel = 'quiet' | 'moderate' | 'busy'

export function describeLevel(level: number): BusynessLevel {
  if (level <= 30) return 'quiet'
  if (level <= 65) return 'moderate'
  return 'busy'
}

/** The quietest open hour of the day (the earliest, if tied), or null if closed all day. */
export function quietestHour(day: HourlyBusyness): { hour: number; level: number } | null {
  let best: { hour: number; level: number } | null = null
  for (const { hour, level } of day) {
    if (level !== null && (best === null || level < best.level)) best = { hour, level }
  }
  return best
}

export const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`

/** The quietest open hours of a typical weekday and Saturday, quietest first ("14:00"). */
export function quietTimes(
  clubSlug: string,
  space: Pick<Space, 'id' | 'category' | 'openingHours'>,
  clubHours: OpeningHours[],
  count = 2,
): { weekdays: string[]; weekends: string[] } {
  const quietest = (day: Weekday) =>
    busynessForDay(clubSlug, space, clubHours, day)
      .filter((h): h is { hour: number; level: number } => h.level !== null)
      .sort((a, b) => a.level - b.level || a.hour - b.hour)
      .slice(0, count)
      .map((h) => formatHour(h.hour))
  return { weekdays: quietest('Wednesday'), weekends: quietest('Saturday') }
}
