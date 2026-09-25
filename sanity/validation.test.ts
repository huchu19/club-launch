import { describe, expect, it } from 'vitest'
import { placeholderRule } from './validation'

describe('club page publish rule', () => {
  const draft = {
    _id: 'drafts.page',
    _type: 'clubPage',
    title: 'Linden Moorgate',
    blocks: [
      { _type: 'heroBlock', _key: 'a', subheading: 'Opening [[DATE: opening date]].' },
      {
        _type: 'ratesBlock',
        _key: 'b',
        plans: [
          { _key: 'c', name: 'Founding', pricePerMonth: '[[PRICE: founding monthly membership]]' },
        ],
      },
    ],
  }

  it('blocks publishing while placeholders remain', () => {
    expect(placeholderRule(draft)).toBe(
      'Replace 2 placeholders before publishing: [[DATE: opening date]], [[PRICE: founding monthly membership]]',
    )
  })

  it('still blocks a half-deleted placeholder', () => {
    expect(placeholderRule({ title: 'Opening [[DATE' })).toMatch(/^Replace 1 placeholder before/)
  })

  it('allows publishing once every placeholder is replaced', () => {
    const fixed = structuredClone(draft)
    fixed.blocks[0]!.subheading = 'Opening in March.'
    fixed.blocks[1]!.plans![0]!.pricePerMonth = '199'
    expect(placeholderRule(fixed)).toBe(true)
  })
})
