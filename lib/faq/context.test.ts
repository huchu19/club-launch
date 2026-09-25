import { describe, expect, it } from 'vitest'
import { demoClubs } from '@/lib/content/demo-data'
import { buildGroundingContext } from './context'

const [mayfair, moorgate] = demoClubs as [(typeof demoClubs)[0], (typeof demoClubs)[0]]

describe('buildGroundingContext', () => {
  const context = buildGroundingContext(mayfair, [
    { question: 'Is there parking?', answer: 'No on-site parking.' },
  ])

  it('includes the club basics, hours, facilities, facts and approved answers', () => {
    expect(context).toContain('Club: Linden Mayfair')
    expect(context).toContain('Address: 7 Linden Mews, Mayfair, London W1K 2AB')
    expect(context).toContain('- Monday to Thursday: 06:00–22:30')
    expect(context).toContain(
      '- Thermal suite (spa): Sauna, steam room and a salt inhalation room.',
    )
    expect(context).toContain('- Joining fee: £150, paid once when you join.')
    expect(context).toContain('Q: Is there parking?\nA: No on-site parking.')
  })

  it('contains nothing about any other club', () => {
    expect(context).not.toContain(moorgate.name)
    expect(context).not.toContain(moorgate.address.streetAddress)
  })

  it('omits empty sections', () => {
    const bare = buildGroundingContext(
      { ...mayfair, facts: [], facilities: [], openingHours: [] },
      [],
    )
    expect(bare).not.toMatch(/Facts:|Facilities:|Opening hours:|Answered questions:/)
  })
})
