import { describe, expect, it } from 'vitest'
import { periodAt, periodOfHour } from './period'

describe('periodOfHour', () => {
  it.each([
    [0, 'night'],
    [5, 'night'],
    [6, 'morning'],
    [10, 'morning'],
    [11, 'midday'],
    [15, 'midday'],
    [16, 'evening'],
    [21, 'evening'],
    [22, 'night'],
    [23, 'night'],
  ] as const)('%i:00 is %s', (hour, period) => expect(periodOfHour(hour)).toBe(period))
})

describe('periodAt', () => {
  it('uses the club’s time zone, not the server’s', () => {
    // 05:30 UTC on 1 July is 06:30 in London (BST): morning there, still night in UTC.
    const instant = new Date('2026-07-01T05:30:00Z')
    expect(periodAt(instant, 'Europe/London')).toBe('morning')
    expect(periodAt(instant, 'UTC')).toBe('night')
    // …and early afternoon in Tokyo.
    expect(periodAt(instant, 'Asia/Tokyo')).toBe('midday')
  })

  it('follows the clocks going back in October', () => {
    // After 25 October 2026 London is on GMT: 05:30 UTC is 05:30 local, still night.
    expect(periodAt(new Date('2026-10-26T05:30:00Z'), 'Europe/London')).toBe('night')
  })

  it('crosses midnight', () => {
    // 21:59 and 22:00 London on a summer evening, then 00:30 the next day.
    expect(periodAt(new Date('2026-07-01T20:59:00Z'), 'Europe/London')).toBe('evening')
    expect(periodAt(new Date('2026-07-01T21:00:00Z'), 'Europe/London')).toBe('night')
    expect(periodAt(new Date('2026-07-01T23:30:00Z'), 'Europe/London')).toBe('night')
  })
})
