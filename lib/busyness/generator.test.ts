import { describe, expect, it } from 'vitest'
import { demoClubs } from '@/lib/content/demo-data'
import { busynessForDay, describeLevel, hashSeed, quietestHour, seededRandom } from './generator'

const mayfair = demoClubs[0]!
const space = (id: string) => mayfair.spaces.find((s) => s.id === id)!
const day = (id: string, weekday: Parameters<typeof busynessForDay>[3]) =>
  busynessForDay(mayfair.slug, space(id), mayfair.openingHours, weekday)
const at = (series: ReturnType<typeof day>, hour: number) =>
  series.find((h) => h.hour === hour)!.level!

describe('busyness generator', () => {
  it('is deterministic: the same inputs always give the same numbers', () => {
    expect(day('strength-studio', 'Wednesday')).toEqual(day('strength-studio', 'Wednesday'))
    const a = seededRandom(hashSeed('x'))
    const b = seededRandom(hashSeed('x'))
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('varies between spaces and days', () => {
    expect(day('strength-studio', 'Wednesday')).not.toEqual(day('strength-studio', 'Thursday'))
    expect(day('pool', 'Wednesday')).not.toEqual(day('strength-studio', 'Wednesday'))
  })

  it('has morning and after-work peaks with a quiet mid-afternoon in the gym', () => {
    const gym = day('strength-studio', 'Tuesday')
    expect(at(gym, 7)).toBeGreaterThan(at(gym, 14))
    expect(at(gym, 18)).toBeGreaterThan(at(gym, 14))
    expect(describeLevel(at(gym, 18))).toBe('busy')
    expect(describeLevel(at(gym, 14))).toBe('quiet')
  })

  it('makes the spa busier in the evening and at weekends', () => {
    const weekday = day('thermal-suite', 'Tuesday')
    expect(at(weekday, 20)).toBeGreaterThan(at(weekday, 10))
    const saturday = day('thermal-suite', 'Saturday')
    expect(at(saturday, 15)).toBeGreaterThan(at(weekday, 15))
  })

  it('keeps levels between 0 and 100 in steps of 5, and null when closed', () => {
    for (const s of mayfair.spaces) {
      for (const weekday of ['Monday', 'Saturday'] as const) {
        for (const { level } of busynessForDay(mayfair.slug, s, mayfair.openingHours, weekday)) {
          if (level !== null) {
            expect(level).toBeGreaterThanOrEqual(0)
            expect(level).toBeLessThanOrEqual(100)
            expect(level % 5).toBe(0)
          }
        }
      }
    }
    // The workspace opens at 08:00 at weekends.
    expect(day('workspace', 'Saturday').find((h) => h.hour === 7)!.level).toBeNull()
  })

  it('finds the quietest open hour', () => {
    expect(
      quietestHour([
        { hour: 6, level: null },
        { hour: 7, level: 40 },
        { hour: 8, level: 20 },
        { hour: 9, level: 20 },
      ]),
    ).toEqual({ hour: 8, level: 20 })
    expect(quietestHour([{ hour: 6, level: null }])).toBeNull()
  })
})
