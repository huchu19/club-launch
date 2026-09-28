import { describe, expect, it } from 'vitest'
import { demoClubs, demoPages } from '../content/demo-data'
import type { PageBlock } from '../content/types'
import { auditSingleSource } from './audit'

const mayfair = demoClubs[0]!
const page = demoPages[0]!
const audit = (blocks: PageBlock[], club = mayfair) =>
  auditSingleSource({ clubs: [club], pages: [{ clubId: club._id, title: 'Mayfair', blocks }] })
const extra = (block: Record<string, unknown>) => [...page.blocks, block as unknown as PageBlock]

describe('single source of club facts', () => {
  it('passes the seeded content for every club', () => {
    expect(auditSingleSource({ clubs: demoClubs, pages: demoPages })).toEqual([])
  })

  it('flags a block that stores a club field', () => {
    expect(
      audit(
        extra({
          _type: 'facilitiesBlock',
          _key: 'x',
          heading: 'F',
          facilities: [{ name: 'Pool' }],
        }),
      ),
    ).toEqual([
      '"Mayfair", block 11 (facilitiesBlock) stores "facilities", which belongs on the club.',
    ])
  })

  it('flags copy that repeats the phone number, address or an opening time', () => {
    const problems = audit(
      extra({
        _type: 'heroBlock',
        _key: 'x',
        heading: 'Call 020 7946 0018, 7 Linden Mews, open from 06:00',
        periodVariants: [],
      }),
    )
    expect(problems).toEqual([
      '"Mayfair", block 11 (heroBlock) repeats the club\'s phone number in heroBlock.heading.',
      '"Mayfair", block 11 (heroBlock) repeats the club\'s address in heroBlock.heading.',
      '"Mayfair", block 11 (heroBlock) repeats the opening time 06:00 in heroBlock.heading.',
    ])
  })

  it('allows prices only in the offer blocks’ price fields', () => {
    expect(
      audit(
        extra({
          _type: 'tourBookingBlock',
          _key: 'x',
          heading: 'Tours',
          intro: 'Join for £245 a month',
        }),
      ),
    ).toEqual([
      '"Mayfair", block 11 (tourBookingBlock) states a price in tourBookingBlock.intro; prices belong in the offer blocks.',
    ])
  })

  it('flags spa copy that repeats a space’s description', () => {
    const problems = audit(
      extra({
        _type: 'spaRecoveryBlock',
        _key: 'x',
        heading: 'Spa',
        items: [
          {
            _key: 'a',
            name: 'Pool',
            description: 'A naturally lit lap pool with lane swimming all day.',
          },
        ],
      }),
    )
    expect(problems[0]).toMatch(
      /copies a space's description in spaRecoveryBlock\.items\.description/,
    )
  })

  it('flags a club fact that restates a membership price', () => {
    const club = {
      ...mayfair,
      facts: [...mayfair.facts, { label: 'Club membership', value: '£245 per month.' }],
    }
    expect(audit(page.blocks, club)).toEqual([
      'Linden Mayfair\'s fact "Club membership" restates a membership price from the page.',
    ])
  })
})
