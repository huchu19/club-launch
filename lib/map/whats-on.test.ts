import { describe, expect, it } from 'vitest'
import { demoClubs } from '@/lib/content/demo-data'
import { localMoment, spaceStatus } from './whats-on'

const mayfair = demoClubs[0]!
const space = (id: string) => mayfair.spaces.find((s) => s.id === id)!
const at =
  (iso: string, timeZone = 'Europe/London') =>
  (id: string) =>
    spaceStatus(space(id), mayfair, localMoment(new Date(iso), timeZone))

describe('localMoment', () => {
  it('uses the club’s time zone, including British Summer Time', () => {
    // 06:20 UTC on Wednesday 1 July 2026 is 07:20 in London (BST).
    expect(localMoment(new Date('2026-07-01T06:20:00Z'), 'Europe/London')).toEqual({
      day: 'Wednesday',
      time: '07:20',
      minutes: 440,
    })
    // In winter London is on UTC.
    expect(localMoment(new Date('2026-12-02T07:20:00Z'), 'Europe/London').time).toBe('07:20')
  })

  it('crosses midnight into the right day', () => {
    // 23:30 UTC on Tuesday 30 June is 00:30 on Wednesday in London.
    expect(localMoment(new Date('2026-06-30T23:30:00Z'))).toMatchObject({
      day: 'Wednesday',
      time: '00:30',
    })
    // …and still Tuesday evening in New York.
    expect(localMoment(new Date('2026-06-30T23:30:00Z'), 'America/New_York')).toMatchObject({
      day: 'Tuesday',
      time: '19:30',
    })
  })
})

describe('spaceStatus', () => {
  it('finds the class running now and the next one', () => {
    // 07:20 London, Wednesday: Morning mobility runs 07:15–07:45 in the studio.
    const studio = at('2026-07-01T06:20:00Z')('movement-studio')
    expect(studio.open).toBe(true)
    expect(studio.now).toMatchObject({ name: 'Morning mobility', time: '07:15', endsAt: '07:45' })
    expect(studio.next).toMatchObject({ name: 'Vinyasa yoga', time: '08:00', isToday: true })
  })

  it('would be wrong in UTC, which is why the time zone matters', () => {
    // The same instant read as UTC (06:20) is before Morning mobility starts.
    const studio = at('2026-07-01T06:20:00Z', 'UTC')('movement-studio')
    expect(studio.now).toBeUndefined()
  })

  it('treats a class as over at its end time', () => {
    const studio = at('2026-07-01T06:45:00Z')('movement-studio') // 07:45 London
    expect(studio.now).toBeUndefined()
    expect(studio.next?.name).toBe('Vinyasa yoga')
  })

  it('is closed before opening and after midnight, and looks ahead to the next day', () => {
    // 00:30 London on Wednesday: closed, and the next class is later that morning.
    const studio = at('2026-06-30T23:30:00Z')('movement-studio')
    expect(studio.open).toBe(false)
    expect(studio.next).toMatchObject({ day: 'Wednesday', time: '07:15', isToday: true })

    // 22:00 London on Sunday: nothing left today, so the next class is Monday.
    const late = at('2026-07-05T21:00:00Z')('movement-studio')
    expect(late.next).toMatchObject({ day: 'Monday', isToday: false })
  })

  it('uses a space’s own hours when it has them', () => {
    // 20:30 London on a Wednesday: the club is open, the workspace (07:00–20:00) is not.
    const workspace = at('2026-07-01T19:30:00Z')('workspace')
    expect(workspace.hours).toEqual({ opens: '07:00', closes: '20:00' })
    expect(workspace.open).toBe(false)
    expect(at('2026-07-01T19:30:00Z')('pool').open).toBe(true)
  })

  it('has no next class for a space without any', () => {
    expect(at('2026-07-01T09:00:00Z')('garden-kitchen').next).toBeUndefined()
  })
})
