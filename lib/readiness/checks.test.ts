import { describe, expect, it } from 'vitest'
import { mockDraftFor } from '@/lib/ai/mock-models'
import { demoClubs, demoPages } from '@/lib/content/demo-data'
import { toSanityBlocks } from '@/lib/content/to-sanity'
import { buildDrafterPrompt } from '@/lib/drafter/prompt'
import { draftOutputSchema } from '@/lib/drafter/schema'
import { draftToBlocks } from '@/lib/drafter/to-blocks'
import { readinessChecks, readinessScore, type ReadinessInput } from './checks'

const [mayfair, moorgate] = demoClubs as [(typeof demoClubs)[0], (typeof demoClubs)[0]]

/** The Mayfair page as Sanity stores it: images are asset references with alt text. */
const mayfairPage = () => ({
  title: demoPages[0]!.title,
  seo: demoPages[0]!.seo,
  blocks: toSanityBlocks(demoPages[0]!.blocks, (image) => ({
    _type: 'image',
    asset: { _type: 'reference', _ref: `image-${image.url}` },
    alt: image.alt,
  })),
})

const input = (overrides: Partial<ReadinessInput> = {}): ReadinessInput => ({
  page: mayfairPage(),
  club: mayfair,
  approvedFaqCount: 5,
  ...overrides,
})

const failing = (i: ReadinessInput) =>
  readinessChecks(i)
    .filter((c) => !c.ok)
    .map((c) => c.id)

describe('launch readiness', () => {
  it('passes the finished Mayfair page at 100%', () => {
    const checks = readinessChecks(input())
    expect(checks.filter((c) => !c.ok)).toEqual([])
    expect(readinessScore(checks)).toBe(100)
  })

  it('passes the coming-soon Marylebone page, founding offer included, at 100%', () => {
    const marylebone = demoClubs[2]!
    const page = demoPages.find((p) => p.clubId === marylebone._id)!
    const checks = readinessChecks({
      page: {
        title: page.title,
        seo: page.seo,
        blocks: toSanityBlocks(page.blocks, (image) => ({
          _type: 'image',
          asset: { _type: 'reference', _ref: 'image-x' },
          alt: image.alt,
        })),
      },
      club: marylebone,
      approvedFaqCount: 5,
    })
    expect(checks.filter((c) => !c.ok)).toEqual([])
  })

  it('shows exactly which checks the Moorgate draft fails', () => {
    const prompt = buildDrafterPrompt(moorgate, 'Announce the conversion.', 'calm')
    const draft = draftOutputSchema.parse(mockDraftFor(prompt))
    const page = {
      title: draft.title,
      seo: draft.seo,
      blocks: toSanityBlocks(draftToBlocks(draft)),
    }
    const checks = readinessChecks({ page, club: moorgate, approvedFaqCount: 5 })
    expect(checks.filter((c) => !c.ok).map((c) => c.id)).toEqual(['placeholders', 'joiningFee'])
    expect(checks.find((c) => c.id === 'placeholders')!.problems[0]).toMatch(
      /^Replace 4 placeholders: \[\[DATE: opening date\]\]/,
    )
    expect(checks.find((c) => c.id === 'joiningFee')!.problems).toEqual([
      'Add the joining fee to "Founding member"',
    ])
    expect(readinessScore(checks)).toBe(71)
  })

  it('placeholders: any [[ fails, even a half-deleted one', () => {
    const page = mayfairPage()
    page.title = 'Opening [[DATE'
    expect(failing(input({ page }))).toEqual(['placeholders'])
  })

  it('images: every uploaded image needs alt text', () => {
    const page = mayfairPage()
    const hero = page.blocks[0] as { image?: { alt?: string } }
    hero.image!.alt = '  '
    const check = readinessChecks(input({ page })).find((c) => c.id === 'images')!
    expect(check.problems).toEqual(['Add alt text to the image in block 1 (Hero)'])
  })

  it('seo: title and description must be present and within length', () => {
    const noSeo = { ...mayfairPage(), seo: undefined }
    expect(failing(input({ page: noSeo, club: { ...mayfair, seo: undefined } }))).toEqual(['seo'])
    // The club's own SEO is the fallback.
    expect(failing(input({ page: noSeo }))).toEqual([])
    const long = { ...mayfairPage(), seo: { title: 'x'.repeat(61), description: 'Short.' } }
    expect(readinessChecks(input({ page: long })).find((c) => c.id === 'seo')!.problems).toEqual([
      'Shorten the SEO title to 60 characters (it has 61)',
      'Lengthen the SEO description to at least 50 characters',
    ])
  })

  it('hours: present, real days, 24-hour times, opening before closing, no repeats', () => {
    const bad = {
      openingHours: [
        { day: 'Monday', opens: '06:00', closes: '22:00' },
        { day: 'Monday', opens: '07:00', closes: '21:00' },
        { day: 'Tuesday', opens: '6am', closes: '22:00' },
        { day: 'Wednesday', opens: '22:00', closes: '06:00' },
      ],
    }
    expect(readinessChecks(input({ club: bad })).find((c) => c.id === 'hours')!.problems).toEqual([
      'Monday is listed twice',
      'Use 24-hour times like 06:00 for Tuesday',
      'Wednesday closes before it opens',
    ])
    expect(failing(input({ club: { openingHours: [] } }))).toContain('hours')
  })

  it('joining fee: every plan with a price shows one', () => {
    const page = mayfairPage()
    const rates = page.blocks.find((b) => b._type === 'ratesBlock') as {
      plans: Array<{ joiningFee?: string }>
    }
    rates.plans[1]!.joiningFee = undefined
    expect(readinessChecks(input({ page })).find((c) => c.id === 'joiningFee')!.problems).toEqual([
      'Add the joining fee to "Club and workspace"',
    ])
  })

  it('joining fee: a founding offer counts too, and 0 ("no joining fee") is fine', () => {
    const page = mayfairPage()
    page.blocks.push({
      _type: 'foundingBlock',
      _key: 'f',
      heading: 'Founding offer',
      joiningFee: '0',
    } as never)
    expect(failing(input({ page }))).toEqual([])
    ;(page.blocks.at(-1) as { joiningFee?: string }).joiningFee = undefined
    expect(readinessChecks(input({ page })).find((c) => c.id === 'joiningFee')!.problems).toEqual([
      'Add the joining fee to "Founding offer"',
    ])
  })

  it('tour: the page needs a tour booking block', () => {
    const page = mayfairPage()
    page.blocks = page.blocks.filter((b) => b._type !== 'tourBookingBlock')
    expect(failing(input({ page }))).toEqual(['tour'])
  })

  it('faqs: at least five approved answers', () => {
    const check = readinessChecks(input({ approvedFaqCount: 2 })).find((c) => c.id === 'faqs')!
    expect(check.problems).toEqual(['Approve at least 5 FAQs for this club (2 so far)'])
    expect(readinessScore(readinessChecks(input({ approvedFaqCount: 2 })))).toBe(86)
  })
})
