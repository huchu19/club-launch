import { describe, expect, it } from 'vitest'
import { demoClubs, demoPages } from '@/lib/content/demo-data'
import { offersOf } from '@/lib/content/rate-plans'
import { buildGroundingContext } from './context'

const [mayfair, moorgate] = demoClubs as [(typeof demoClubs)[0], (typeof demoClubs)[0]]

describe('buildGroundingContext', () => {
  const context = buildGroundingContext(
    mayfair,
    [{ question: 'Is there parking?', answer: 'No on-site parking.' }],
    offersOf(demoPages[0]!.blocks),
  )

  it('includes the club basics, hours, facilities, facts and approved answers', () => {
    expect(context).toContain('Club: Linden Mayfair')
    expect(context).toContain('Address: 7 Linden Mews, Mayfair, London W1K 2AB')
    expect(context).toContain('- Monday to Thursday: 06:00–22:30')
    expect(context).toContain(
      '- Thermal suite (spa): Sauna, steam room and a salt inhalation room, looking onto the garden.',
    )
    // Prices come from the page's rates block, the only place they are stored.
    expect(context).toContain('- Club: £245 per month, joining fee £150')
    expect(context).toContain('- Off-peak: £175 per month, joining fee £150')
    expect(context).toContain('Q: Is there parking?\nA: No on-site parking.')
  })

  it('contains nothing about any other club', () => {
    expect(context).not.toContain(moorgate.name)
    expect(context).not.toContain(moorgate.address.streetAddress)
  })

  it('describes a founding offer, and a waived joining fee', () => {
    const marylebone = demoClubs[2]!
    const page = demoPages.find((p) => p.clubId === marylebone._id)!
    expect(buildGroundingContext(marylebone, [], offersOf(page.blocks))).toContain(
      'Founding membership: £195 per month, no joining fee, 150 places in total.',
    )
  })

  it('omits empty sections', () => {
    const bare = buildGroundingContext({ ...mayfair, facts: [], spaces: [], openingHours: [] }, [])
    expect(bare).not.toMatch(
      /Facts:|Facilities:|Opening hours:|Answered questions:|Membership plans:|Founding/,
    )
  })
})
