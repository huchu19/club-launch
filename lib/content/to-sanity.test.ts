import { describe, expect, it } from 'vitest'
import { demoPages } from './demo-data'
import { toSanityBlocks } from './to-sanity'
import { pageBlockSchema } from './types'

describe('toSanityBlocks', () => {
  const blocks = toSanityBlocks(demoPages[0]!.blocks, (image) => ({
    _type: 'image',
    asset: { _type: 'reference', _ref: `image-${image.url}` },
    alt: image.alt,
  }))

  it('adds array member types and turns images into asset references', () => {
    const hero = blocks.find((b) => b._type === 'heroBlock') as Record<string, unknown>
    expect(hero.image).toMatchObject({
      _type: 'image',
      asset: { _ref: expect.stringMatching(/^image-/) },
    })
    const spa = blocks.find((b) => b._type === 'spaRecoveryBlock') as {
      items: Array<Record<string, unknown>>
    }
    expect(spa.items.every((i) => i._type === 'spaRecoveryItem' && i._key)).toBe(true)
    const rates = blocks.find((b) => b._type === 'ratesBlock') as {
      plans: Array<Record<string, unknown>>
    }
    expect(rates.plans.every((p) => p._type === 'ratePlan')).toBe(true)
  })

  it('keeps every block valid for the page view model (minus images)', () => {
    for (const block of toSanityBlocks(demoPages[0]!.blocks)) {
      expect(pageBlockSchema.safeParse(block).success).toBe(true)
    }
  })

  it('drops an empty facilities override so the club list is used', () => {
    const facilities = blocks.find((b) => b._type === 'facilitiesBlock') as Record<string, unknown>
    expect(facilities).not.toHaveProperty('facilities')
  })
})
