import { describe, expect, it } from 'vitest'
import { addDaysIso, createTourRequestSchema, todayIso, tourFieldErrors } from './schema'

const TODAY = '2026-09-25'
const schema = createTourRequestSchema(TODAY)

const valid = {
  clubSlug: 'linden-mayfair',
  name: 'Sam Rivera',
  email: 'sam@example.com',
  preferredDate: '2026-10-01',
  timeSlot: 'morning',
  consent: true,
}

function errorsFor(input: Record<string, unknown>) {
  const result = schema.safeParse(input)
  return result.success ? {} : tourFieldErrors(result.error)
}

describe('tour request schema', () => {
  it('accepts a complete request and trims text', () => {
    const result = schema.parse({ ...valid, name: '  Sam Rivera ', phone: ' +44 20 7946 0000 ' })
    expect(result.name).toBe('Sam Rivera')
    expect(result.phone).toBe('+44 20 7946 0000')
  })

  it('gives a clear message for every missing required field', () => {
    expect(errorsFor({ clubSlug: 'linden-mayfair' })).toEqual({
      name: 'Enter your name',
      email: 'Enter your email address',
      preferredDate: 'Enter a preferred date',
      timeSlot: 'Choose a time of day',
      consent: 'Tick the box to agree that we can contact you about your tour',
    })
  })

  it('rejects a malformed email address', () => {
    expect(errorsFor({ ...valid, email: 'sam@' }).email).toMatch(/correct format/)
  })

  it('only allows dates from today up to 90 days ahead', () => {
    expect(errorsFor({ ...valid, preferredDate: '2026-09-24' }).preferredDate).toBe(
      'Choose a date from today onwards',
    )
    expect(errorsFor({ ...valid, preferredDate: TODAY })).toEqual({})
    expect(errorsFor({ ...valid, preferredDate: addDaysIso(TODAY, 90) })).toEqual({})
    expect(errorsFor({ ...valid, preferredDate: addDaysIso(TODAY, 91) }).preferredDate).toMatch(
      /within the next 90 days/,
    )
    expect(errorsFor({ ...valid, preferredDate: '2026-02-30' }).preferredDate).toBe(
      'Enter a real date',
    )
  })

  it('rejects phone numbers with letters and over-long input', () => {
    expect(errorsFor({ ...valid, phone: 'call me' }).phone).toMatch(/digits/)
    expect(errorsFor({ ...valid, name: 'x'.repeat(101) }).name).toMatch(/100 characters/)
  })

  it('requires consent to be exactly true', () => {
    expect(errorsFor({ ...valid, consent: 'yes' }).consent).toBeDefined()
    expect(errorsFor({ ...valid, consent: false }).consent).toBeDefined()
  })

  it('rejects slugs that are not simple identifiers', () => {
    expect(schema.safeParse({ ...valid, clubSlug: '../etc' }).success).toBe(false)
  })
})

describe('todayIso', () => {
  it('uses the London calendar date', () => {
    // Before British Summer Time starts (29 March 2026), London is on UTC.
    expect(todayIso('Europe/London', new Date('2026-03-25T23:30:00Z'))).toBe('2026-03-25')
    // In summer, 23:30 UTC is 00:30 the next day in London.
    expect(todayIso('Europe/London', new Date('2026-07-01T23:30:00Z'))).toBe('2026-07-02')
  })
})
