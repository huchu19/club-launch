import { describe, expect, it } from 'vitest'
import type { SanityDocument, ValidationContext } from 'sanity'
import { demoClubs, demoPages } from '../lib/content/demo-data'
import { toSanityBlocks } from '../lib/content/to-sanity'
import { readinessRule } from './readiness-rule'

const mayfair = demoClubs[0]!

const contextWith = (approvedFaqs: number) =>
  ({
    getClient: () => ({ fetch: async () => ({ club: mayfair, approvedFaqs }) }),
  }) as unknown as ValidationContext

const page = (overrides: Record<string, unknown> = {}) =>
  ({
    _id: 'clubPage-linden-mayfair',
    _type: 'clubPage',
    club: { _type: 'reference', _ref: mayfair._id },
    title: 'Linden Mayfair',
    seo: demoPages[0]!.seo,
    blocks: toSanityBlocks(demoPages[0]!.blocks, (image) => ({
      _type: 'image',
      asset: { _type: 'reference', _ref: 'image-x' },
      alt: image.alt,
    })),
    ...overrides,
  }) as unknown as SanityDocument

describe('readinessRule (the Studio publish gate)', () => {
  it('lets a ready page publish', async () => {
    expect(await readinessRule(page(), contextWith(5))).toBe(true)
  })

  it('blocks publishing below 100% and says what is missing', async () => {
    expect(await readinessRule(page(), contextWith(3))).toBe(
      'Not ready to launch (86%). Approve at least 5 FAQs for this club (3 so far).',
    )
  })

  it('leaves placeholders to the placeholder rule rather than reporting them twice', async () => {
    const result = await readinessRule(
      page({ title: 'Opening [[DATE: opening date]]' }),
      contextWith(5),
    )
    expect(result).toBe(true)
  })

  it('ignores an empty document', async () => {
    expect(await readinessRule(undefined, contextWith(0))).toBe(true)
  })
})
