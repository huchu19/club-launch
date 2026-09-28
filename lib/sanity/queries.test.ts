import { evaluate, parse } from 'groq-js'
import { describe, expect, it } from 'vitest'
import { demoImages, MAYFAIR_ID, MOORGATE_ID } from '@/lib/content/demo-data'
import { buildSeedDocuments, type SeedDocument } from '@/lib/content/seed-documents'
import {
  clubOptionSchema,
  clubPageSchema,
  clubPageSummarySchema,
  clubSchema,
  dayPlanSchema,
} from '@/lib/content/types'
import {
  APPROVED_FAQS_QUERY,
  CLUB_BY_ID_QUERY,
  CLUB_BY_SLUG_QUERY,
  CLUB_PAGE_QUERY,
  CLUB_PAGES_QUERY,
  CLUBS_WITH_PAGE_STATE_QUERY,
  DAY_PLAN_QUERY,
  FAQ_CANDIDATES_QUERY,
} from './queries'

// Runs the app's real GROQ queries with groq-js (Sanity's own GROQ engine)
// over exactly the documents `pnpm seed` writes, then parses the results with
// the view-model schemas the pages use. Catches query and projection mistakes
// without needing a Sanity project.

function assetFor(image: { url: string; width?: number; height?: number }) {
  const name = image.url.split('/').pop()!.replace('.jpg', '')
  const id = `image-${name}-${image.width}x${image.height}-jpg`
  return {
    _id: id,
    _type: 'sanity.imageAsset',
    url: `https://cdn.sanity.io/images/proj/production/${name}-${image.width}x${image.height}.jpg`,
    metadata: {
      dimensions: { width: image.width, height: image.height },
      lqip: 'data:image/jpeg;base64,AAA',
    },
  }
}

const assets = Object.values(demoImages).map(assetFor)
const dataset: SeedDocument[] = [
  ...assets,
  ...buildSeedDocuments((image) => ({
    _type: 'image',
    asset: { _type: 'reference', _ref: assetFor(image)._id },
    alt: image.alt,
  })),
]

async function run(query: string, params: Record<string, unknown> = {}, docs = dataset) {
  const value = await evaluate(parse(query), { dataset: docs, params })
  return value.get()
}

describe('GROQ queries over the seeded dataset', () => {
  it('CLUB_PAGE_QUERY returns a complete, valid Mayfair page with resolved images', async () => {
    const page = clubPageSchema.parse(
      await run(CLUB_PAGE_QUERY, { market: 'uk', slug: 'linden-mayfair' }),
    )
    expect(page.club).toMatchObject({
      name: 'Linden Mayfair',
      market: { code: 'uk', currency: 'GBP' },
    })
    expect(page.club.geo).toEqual({ lat: 51.5098, lng: -0.1492 })
    expect(page.blocks.map((b) => b._type)).toEqual([
      'heroBlock',
      'facilitiesBlock',
      'conciergeBlock',
      'spaRecoveryBlock',
      'ratesBlock',
      'tourBookingBlock',
      'faqBlock',
    ])
    const hero = page.blocks[0]
    expect(hero?._type === 'heroBlock' && hero.image).toMatchObject({
      url: expect.stringMatching(/^https:\/\/cdn\.sanity\.io\/images\//),
      alt: demoImages.heroArches.alt,
      width: 1600,
      height: 1000,
    })
    const spa = page.blocks.find((b) => b._type === 'spaRecoveryBlock')
    expect(spa?._type === 'spaRecoveryBlock' && spa.items.every((i) => i.image?.url)).toBe(true)
    // Approved FAQs only, most asked first.
    expect(page.faqs.map((f) => f._id)).toEqual([
      'faq-mayfair-parking',
      'faq-mayfair-guests',
      'faq-mayfair-classes',
      'faq-mayfair-towels',
      'faq-mayfair-access',
    ])
  })

  it('CLUB_PAGE_QUERY ignores pending FAQs and returns null for unknown pages', async () => {
    const withPending = [
      ...dataset,
      {
        _id: 'faq-p',
        _type: 'faqItem',
        club: { _type: 'reference', _ref: MAYFAIR_ID },
        question: 'Q',
        answer: 'A',
        status: 'pending',
      },
    ]
    const page = clubPageSchema.parse(
      await run(CLUB_PAGE_QUERY, { market: 'uk', slug: 'linden-mayfair' }, withPending),
    )
    expect(page.faqs.map((f) => f._id)).not.toContain('faq-p')
    expect(await run(CLUB_PAGE_QUERY, { market: 'uk', slug: 'linden-moorgate' })).toBeNull()
    expect(await run(CLUB_PAGE_QUERY, { market: 'fr', slug: 'linden-mayfair' })).toBeNull()
  })

  it('CLUB_PAGES_QUERY lists published pages as index cards', async () => {
    const rows = (await run(CLUB_PAGES_QUERY)) as unknown[]
    const [card] = rows.map((row) => clubPageSummarySchema.parse(row))
    expect(rows).toHaveLength(1)
    expect(card).toMatchObject({
      clubName: 'Linden Mayfair',
      slug: 'linden-mayfair',
      market: 'uk',
      status: 'open',
      locality: 'Mayfair, London',
    })
    expect(card?.image?.url).toMatch(/cdn\.sanity\.io/)
  })

  it('club queries return valid clubs by slug and id', async () => {
    expect(
      clubSchema.parse(await run(CLUB_BY_SLUG_QUERY, { slug: 'linden-moorgate' })).status,
    ).toBe('coming-soon')
    expect(
      clubSchema.parse(await run(CLUB_BY_ID_QUERY, { id: MAYFAIR_ID })).facts.length,
    ).toBeGreaterThan(5)
  })

  it('FAQ queries return approved answers and repeat-question candidates', async () => {
    expect(await run(APPROVED_FAQS_QUERY, { clubId: MAYFAIR_ID })).toHaveLength(5)
    const candidates = (await run(FAQ_CANDIDATES_QUERY, { clubId: MAYFAIR_ID })) as Array<{
      normalizedQuestion: string
    }>
    expect(candidates.map((c) => c.normalizedQuestion)).toContain('can i bring a guest')
  })

  it('CLUBS_WITH_PAGE_STATE_QUERY treats a draft page as a page', async () => {
    const state = async (docs: SeedDocument[]) =>
      (
        (await run(CLUBS_WITH_PAGE_STATE_QUERY, {}, docs)) as Array<{
          _id: string
          hasPage: boolean
        }>
      ).map((row) => [row._id, row.hasPage])
    expect(await state(dataset)).toEqual([
      [MAYFAIR_ID, true],
      [MOORGATE_ID, false],
    ])
    const withDraft = [
      ...dataset,
      {
        _id: 'drafts.x',
        _type: 'clubPage',
        club: { _type: 'reference', _ref: MOORGATE_ID },
        title: 'Draft',
      },
    ]
    expect(await state(withDraft)).toEqual([
      [MAYFAIR_ID, true],
      [MOORGATE_ID, true],
    ])
    // Rows the drafter keeps also parse as club options.
    const rows = (await run(CLUBS_WITH_PAGE_STATE_QUERY)) as unknown[]
    expect(rows.every((row) => clubOptionSchema.safeParse(row).success)).toBe(true)
  })

  it('returns club spaces and the sample timetable, and reads a stored day plan', async () => {
    const club = clubSchema.parse(await run(CLUB_BY_SLUG_QUERY, { slug: 'linden-mayfair' }))
    expect(club.spaces.map((s) => s.id)).toContain('thermal-suite')
    expect(club.spaces.find((s) => s.id === 'workspace')?.openingHours).toHaveLength(7)
    expect(club.schedule.length).toBeGreaterThan(20)
    // Every class takes place in a space the club has.
    const ids = new Set(club.spaces.map((s) => s.id))
    expect(club.schedule.every((entry) => ids.has(entry.spaceId))).toBe(true)

    const stored = {
      _id: 'dayPlan-abc123def456ghi7',
      _type: 'dayPlan',
      publicId: 'abc123def456ghi7',
      club: { _type: 'reference', _ref: MAYFAIR_ID, _weak: true },
      day: 'Wednesday',
      summary: 'A balanced Wednesday.',
      stops: [
        {
          _key: 'a',
          _type: 'dayPlanStop',
          time: '08:00',
          spaceId: 'movement-studio',
          className: 'Vinyasa yoga',
          activity: 'Vinyasa yoga',
          reason: 'You start the day moving.',
        },
      ],
      recommendedPlanName: 'Club',
      caveats: [],
      chips: ['I work from home'],
      createdAt: '2026-09-28T09:00:00.000Z',
    }
    const plan = dayPlanSchema.parse(
      await run(DAY_PLAN_QUERY, { publicId: 'abc123def456ghi7' }, [...dataset, stored]),
    )
    expect(plan).toMatchObject({
      clubId: MAYFAIR_ID,
      day: 'Wednesday',
      chips: ['I work from home'],
    })
    expect(plan.stops[0]?.className).toBe('Vinyasa yoga')
  })
})
