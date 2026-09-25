import { describe, expect, it } from 'vitest'
import { demoClubs } from '@/lib/content/demo-data'
import { flagUnverifiedNumbers } from './guard'

const moorgate = demoClubs[1]!

describe('flagUnverifiedNumbers', () => {
  it('wraps numbers that are not in the club facts', () => {
    const { draft, flagged } = flagUnverifiedNumbers(
      { heading: 'Twelve reformers, 40 bikes and a 25-metre pool', price: '£99' },
      moorgate,
    )
    expect(draft).toEqual({
      heading: 'Twelve reformers, [[CHECK: 40]] bikes and a [[CHECK: 25]]-metre pool',
      price: '[[CHECK: £99]]',
    })
    expect(flagged).toEqual(['40', '25', '£99'])
  })

  it('keeps numbers and times that the facts contain', () => {
    const text = 'Members must be 18 or over; open 06:00–22:00 on weekdays.'
    expect(flagUnverifiedNumbers({ text }, moorgate)).toEqual({ draft: { text }, flagged: [] })
  })

  it('leaves existing placeholders untouched', () => {
    const text = 'Opening [[DATE: 1 March]] with [[NUMBER: 30]] founding places'
    expect(flagUnverifiedNumbers({ text }, moorgate).draft.text).toBe(text)
  })

  it('walks nested arrays', () => {
    const { draft } = flagUnverifiedNumbers(
      { plans: [{ inclusions: ['3 guest passes'] }] },
      moorgate,
    )
    expect(draft.plans[0]!.inclusions[0]).toBe('[[CHECK: 3]] guest passes')
  })
})
